-- Native push notification device registry and durable APNs delivery queue.

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios')),
  environment text not null default 'production' check (environment in ('sandbox', 'production')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_devices_user_idx on public.push_devices (user_id) where active;
alter table public.push_devices enable row level security;
-- Device tokens are server-only. Registration is authenticated through the API,
-- then performed with the service role so a token can safely move between users.
revoke all on table public.push_devices from anon, authenticated;

create table public.push_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.push_devices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_token text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','retry','sent','failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  apns_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, device_id)
);

create index push_delivery_queue_ready_idx
  on public.push_delivery_queue (scheduled_for, created_at)
  where status in ('pending','retry');

alter table public.push_delivery_queue enable row level security;
revoke all on table public.push_delivery_queue from anon, authenticated;

create or replace function private.queue_push_for_in_app_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.channel <> 'in_app'
     or not private.email_preference_enabled(new.organization_id, new.user_id, new.template_key) then
    return new;
  end if;

  insert into public.push_delivery_queue (
    notification_id, device_id, organization_id, user_id, device_token,
    environment, template_key, payload, scheduled_for
  )
  select new.id, d.id, new.organization_id, new.user_id, d.token,
    d.environment, new.template_key, new.payload, greatest(new.scheduled_for, now())
  from public.push_devices d
  where d.organization_id = new.organization_id
    and d.user_id = new.user_id
    and d.active;

  return new;
end;
$$;

drop trigger if exists queue_push_for_in_app_notification on public.notifications;
create trigger queue_push_for_in_app_notification
after insert on public.notifications for each row
execute function private.queue_push_for_in_app_notification();

create or replace function public.claim_push_delivery_jobs(batch_size integer default 50)
returns setof public.push_delivery_queue
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  return query
    with ready as (
      select q.id from public.push_delivery_queue q
      where (q.status in ('pending','retry') and q.scheduled_for <= now())
         or (q.status = 'processing' and q.locked_at < now() - interval '10 minutes')
      order by q.scheduled_for, q.created_at
      for update skip locked limit least(greatest(batch_size, 1), 100)
    )
    update public.push_delivery_queue q
    set status = 'processing', attempts = q.attempts + 1,
      locked_at = now(), updated_at = now()
    from ready where q.id = ready.id returning q.*;
end;
$$;

revoke all on function public.claim_push_delivery_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_push_delivery_jobs(integer) to service_role;
