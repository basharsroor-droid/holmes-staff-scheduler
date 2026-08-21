-- Privacy-safe, first-party observability for ShiftPilot.
-- Stores operational errors and a narrow product-event dictionary without
-- free-form customer content. Platform support agents can read the stream;
-- application users cannot write or enumerate it directly.

create table public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('error', 'product')),
  event_name text not null check (char_length(event_name) between 3 and 80),
  severity text not null default 'info' check (severity in ('info', 'warning', 'error', 'fatal')),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  route text check (route is null or (char_length(route) <= 200 and route like '/%')),
  release text check (release is null or char_length(release) <= 64),
  fingerprint text check (fingerprint is null or char_length(fingerprint) <= 64),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index operational_events_type_created_idx
  on public.operational_events (event_type, created_at desc);
create index operational_events_fingerprint_created_idx
  on public.operational_events (fingerprint, created_at desc)
  where fingerprint is not null;
create index operational_events_organization_created_idx
  on public.operational_events (organization_id, created_at desc)
  where organization_id is not null;

alter table public.operational_events enable row level security;

create policy operational_events_support_read on public.operational_events
for select to authenticated
using ((select private.is_platform_support_agent()));

grant select on public.operational_events to authenticated;
revoke insert, update, delete on public.operational_events from authenticated, anon;

create or replace function private.record_product_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event_name text;
  target_organization_id uuid;
  target_actor_user_id uuid;
begin
  if tg_table_name = 'organization_invitations' and tg_op = 'INSERT' then
    target_event_name := 'invite_created';
    target_organization_id := new.organization_id;
    target_actor_user_id := new.invited_by;
  elsif tg_table_name = 'availability_submissions' and tg_op = 'UPDATE'
    and old.submitted_at is null and new.submitted_at is not null then
    target_event_name := 'availability_submitted';
    target_organization_id := new.organization_id;
    target_actor_user_id := new.user_id;
  elsif tg_table_name = 'schedule_periods' and tg_op = 'UPDATE'
    and old.status is distinct from new.status and new.status = 'published' then
    target_event_name := 'schedule_published';
    target_organization_id := new.organization_id;
    target_actor_user_id := coalesce((select auth.uid()), new.created_by);
  elsif tg_table_name = 'swap_requests' and tg_op = 'INSERT' then
    target_event_name := 'swap_requested';
    target_organization_id := new.organization_id;
    target_actor_user_id := new.requested_by;
  elsif tg_table_name = 'swap_requests' and tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status in ('approved', 'rejected', 'cancelled') then
    target_event_name := 'swap_' || new.status::text;
    target_organization_id := new.organization_id;
    target_actor_user_id := coalesce((select auth.uid()), new.decided_by, new.requested_by);
  else
    return new;
  end if;

  insert into public.operational_events (
    event_type, event_name, severity, organization_id, actor_user_id, metadata
  ) values (
    'product', target_event_name, 'info', target_organization_id, target_actor_user_id,
    jsonb_build_object('source', tg_table_name)
  );

  return new;
end;
$$;

create trigger record_invite_created_event
after insert on public.organization_invitations
for each row execute function private.record_product_event();

create trigger record_availability_submitted_event
after update on public.availability_submissions
for each row execute function private.record_product_event();

create trigger record_schedule_published_event
after update on public.schedule_periods
for each row execute function private.record_product_event();

create trigger record_swap_lifecycle_event
after insert or update on public.swap_requests
for each row execute function private.record_product_event();

create or replace function public.purge_expired_operational_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.operational_events where created_at < now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function private.record_product_event() from public, anon, authenticated;
revoke all on function public.purge_expired_operational_events() from public, anon, authenticated;
grant execute on function public.purge_expired_operational_events() to service_role;

comment on table public.operational_events is
  'Privacy-safe operational errors and allow-listed product lifecycle events; no free-form support text or scheduling content.';
