-- Phase 3: durable, preference-aware email delivery.

create table if not exists public.notification_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_published boolean not null default true,
  shift_changes boolean not null default true,
  shift_reminders boolean not null default true,
  availability_reminders boolean not null default true,
  swap_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.notification_preferences enable row level security;

create policy notification_preferences_select_own
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)));

create policy notification_preferences_insert_own
  on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)));

create policy notification_preferences_update_own
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)))
  with check (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)));

create table if not exists public.email_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  recipient text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','retry','sent','failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_delivery_queue_ready_idx
  on public.email_delivery_queue (scheduled_for, created_at)
  where status in ('pending','retry');

alter table public.email_delivery_queue enable row level security;
-- No user policies by design: recipients, provider IDs and failures are server-only.

create or replace function private.email_preference_enabled(
  target_organization_id uuid,
  target_user_id uuid,
  target_template_key text
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when target_template_key = 'schedule_published' then coalesce(p.schedule_published, true)
    when target_template_key = 'shift_assignment_changed' then coalesce(p.shift_changes, true)
    when target_template_key = 'shift_reminder' then coalesce(p.shift_reminders, true)
    when target_template_key in ('availability_reminder','availability_closing') then coalesce(p.availability_reminders, true)
    when target_template_key like 'swap_%' then coalesce(p.swap_updates, true)
    else false
  end
  from (select 1) seed
  left join public.notification_preferences p
    on p.organization_id = target_organization_id and p.user_id = target_user_id;
$$;

create or replace function private.queue_email_for_in_app_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare recipient_email text;
begin
  if new.channel <> 'in_app' or not private.email_preference_enabled(new.organization_id, new.user_id, new.template_key) then
    return new;
  end if;
  select lower(u.email) into recipient_email from auth.users u where u.id = new.user_id;
  if recipient_email is null then return new; end if;
  insert into public.email_delivery_queue (
    organization_id, user_id, recipient, template_key, payload, idempotency_key, scheduled_for
  ) values (
    new.organization_id, new.user_id, recipient_email, new.template_key, new.payload,
    'notification:' || new.id::text, greatest(new.scheduled_for, now())
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

drop trigger if exists queue_email_for_in_app_notification on public.notifications;
create trigger queue_email_for_in_app_notification
after insert on public.notifications for each row
execute function private.queue_email_for_in_app_notification();

create or replace function private.notify_published_shift_assignment_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare assignment_record record; shift_record public.shifts%rowtype;
begin
  if tg_op = 'DELETE' then assignment_record := old; else assignment_record := new; end if;
  select * into shift_record from public.shifts where id = assignment_record.shift_id;
  if shift_record.id is null or shift_record.status <> 'published' then return coalesce(new, old); end if;
  insert into public.notifications (organization_id, user_id, channel, template_key, payload, status, scheduled_for)
  values (
    assignment_record.organization_id, assignment_record.user_id, 'in_app', 'shift_assignment_changed',
    jsonb_build_object('shift_id', shift_record.id, 'shift_date', shift_record.shift_date,
      'start_time', shift_record.start_time, 'name', shift_record.name, 'change', lower(tg_op)),
    'pending', now()
  );
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    insert into public.notifications (organization_id, user_id, channel, template_key, payload, status, scheduled_for)
    values (
      old.organization_id, old.user_id, 'in_app', 'shift_assignment_changed',
      jsonb_build_object('shift_id', shift_record.id, 'shift_date', shift_record.shift_date,
        'start_time', shift_record.start_time, 'name', shift_record.name, 'change', 'removed'),
      'pending', now()
    );
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists notify_published_shift_assignment_change on public.shift_assignments;
create trigger notify_published_shift_assignment_change
after insert or update or delete on public.shift_assignments for each row
execute function private.notify_published_shift_assignment_change();

create or replace function public.enqueue_scheduled_notifications(run_at timestamptz default now())
returns integer language plpgsql security definer set search_path = ''
as $$
declare queued_count integer := 0; changed integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;

  -- Remind assigned employees about a published shift approximately one hour ahead.
  insert into public.notifications (organization_id, user_id, channel, template_key, payload, status, scheduled_for)
  select s.organization_id, a.user_id, 'in_app', 'shift_reminder',
    jsonb_build_object('shift_id', s.id, 'shift_date', s.shift_date, 'start_time', s.start_time, 'name', s.name),
    'pending', run_at
  from public.shift_assignments a
  join public.shifts s on s.id = a.shift_id and s.organization_id = a.organization_id
  join public.organizations o on o.id = s.organization_id
  where s.status = 'published'
    and ((s.shift_date + s.start_time) at time zone coalesce(o.timezone, 'Asia/Jerusalem'))
      between run_at + interval '50 minutes' and run_at + interval '70 minutes'
    and not exists (
      select 1 from public.notifications n where n.user_id = a.user_id
        and n.template_key = 'shift_reminder' and n.payload->>'shift_id' = s.id::text
    );
  get diagnostics changed = row_count; queued_count := queued_count + changed;

  -- Data-driven deadlines: six days before closing (22nd for the default 28th)
  -- and once more on the closing date.
  insert into public.notifications (organization_id, user_id, channel, template_key, payload, status, scheduled_for)
  select p.organization_id, m.user_id, 'in_app',
    case when (p.submission_closes_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date =
      (run_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date
      then 'availability_closing' else 'availability_reminder' end,
    jsonb_build_object('schedule_period_id', p.id, 'year', p.year, 'month', p.month,
      'branch_id', p.branch_id, 'closes_at', p.submission_closes_at),
    'pending', run_at
  from public.schedule_periods p
  join public.organizations o on o.id = p.organization_id
  join public.organization_memberships m on m.organization_id = p.organization_id and m.status = 'active'
  where run_at between p.submission_opens_at and p.submission_closes_at
    and (p.submission_closes_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date
      in ((run_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date,
          (run_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date + 6)
    and not exists (
      select 1 from public.availability_submissions a where a.schedule_period_id = p.id
        and a.user_id = m.user_id and a.submitted_at is not null
    )
    and not exists (
      select 1 from public.notifications n where n.user_id = m.user_id
        and n.template_key in ('availability_reminder','availability_closing')
        and n.payload->>'schedule_period_id' = p.id::text
        and n.template_key = case when (p.submission_closes_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date =
          (run_at at time zone coalesce(o.timezone, 'Asia/Jerusalem'))::date
          then 'availability_closing' else 'availability_reminder' end
    );
  get diagnostics changed = row_count; queued_count := queued_count + changed;
  return queued_count;
end;
$$;

create or replace function public.claim_email_delivery_jobs(batch_size integer default 20)
returns setof public.email_delivery_queue
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  return query
    with ready as (
      select q.id from public.email_delivery_queue q
      where (q.status in ('pending','retry') and q.scheduled_for <= now())
         or (q.status = 'processing' and q.locked_at < now() - interval '10 minutes')
      order by q.scheduled_for, q.created_at
      for update skip locked limit least(greatest(batch_size, 1), 100)
    )
    update public.email_delivery_queue q set status = 'processing', attempts = q.attempts + 1,
      locked_at = now(), updated_at = now()
    from ready where q.id = ready.id returning q.*;
end;
$$;

revoke all on function public.enqueue_scheduled_notifications(timestamptz) from public, anon, authenticated;
revoke all on function public.claim_email_delivery_jobs(integer) from public, anon, authenticated;
grant execute on function public.enqueue_scheduled_notifications(timestamptz) to service_role;
grant execute on function public.claim_email_delivery_jobs(integer) to service_role;
