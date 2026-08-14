create type public.support_ticket_category as enum ('technical', 'account', 'billing', 'feature', 'other');
create type public.support_ticket_priority as enum ('normal', 'high', 'urgent');
create type public.support_ticket_status as enum ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');

create table public.platform_support_agents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_support_agents enable row level security;

create policy support_agents_select_self on public.platform_support_agents
for select to authenticated
using (user_id = (select auth.uid()));

grant select on public.platform_support_agents to authenticated;
revoke insert, update, delete on public.platform_support_agents from authenticated;

create or replace function private.is_platform_support_agent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_support_agents
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_platform_support_agent() from public, anon;
grant execute on function private.is_platform_support_agent() to authenticated;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  category public.support_ticket_category not null,
  priority public.support_ticket_priority not null default 'normal',
  subject text not null check (char_length(trim(subject)) between 4 and 120),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  status public.support_ticket_status not null default 'open',
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_org_status_created_idx
  on public.support_tickets (organization_id, status, created_at desc);
create index support_tickets_created_by_idx
  on public.support_tickets (created_by, created_at desc);

alter table public.support_tickets enable row level security;

create policy support_tickets_select_allowed on public.support_tickets
for select to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_platform_support_agent())
);

create policy support_tickets_insert_member on public.support_tickets
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.is_org_member(organization_id))
  and status = 'open'
  and assigned_to is null
  and resolution_note is null
  and resolved_at is null
);

create policy support_tickets_update_agent on public.support_tickets
for update to authenticated
using ((select private.is_platform_support_agent()))
with check ((select private.is_platform_support_agent()));

grant select, insert, update on public.support_tickets to authenticated;
revoke delete on public.support_tickets from authenticated;

create or replace function private.set_support_ticket_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status in ('resolved', 'closed') and old.status not in ('resolved', 'closed') then
    new.resolved_at := now();
  elsif new.status not in ('resolved', 'closed') then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

create trigger support_tickets_timestamps
before update on public.support_tickets
for each row execute function private.set_support_ticket_timestamps();

create or replace function private.queue_support_ticket_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.email_delivery_queue (
      organization_id, user_id, recipient, template_key, payload, idempotency_key
    )
    select new.organization_id, agent.user_id, lower(auth_user.email), 'support_ticket_created',
      jsonb_build_object('ticket_id', new.id, 'subject', new.subject, 'priority', new.priority),
      'support-created:' || new.id::text || ':' || agent.user_id::text
    from public.platform_support_agents agent
    join auth.users auth_user on auth_user.id = agent.user_id
    where auth_user.email is not null
    on conflict (idempotency_key) do nothing;
  elsif new.status is distinct from old.status or new.resolution_note is distinct from old.resolution_note then
    insert into public.email_delivery_queue (
      organization_id, user_id, recipient, template_key, payload, idempotency_key
    )
    select new.organization_id, new.created_by, lower(auth_user.email), 'support_ticket_updated',
      jsonb_build_object('ticket_id', new.id, 'subject', new.subject, 'status', new.status,
        'resolution_note', coalesce(new.resolution_note, '')),
      'support-updated:' || new.id::text || ':' || extract(epoch from new.updated_at)::bigint::text
    from auth.users auth_user
    where auth_user.id = new.created_by and auth_user.email is not null
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger queue_support_ticket_email
after insert or update on public.support_tickets
for each row execute function private.queue_support_ticket_email();

revoke all on function private.set_support_ticket_timestamps() from public, anon, authenticated;
revoke all on function private.queue_support_ticket_email() from public, anon, authenticated;
