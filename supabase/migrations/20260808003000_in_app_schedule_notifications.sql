-- Add in-app notification read state and notify staff when a schedule is published.

alter table public.notifications
  add column if not exists read_at timestamptz;

create unique index if not exists notifications_schedule_published_once_idx
  on public.notifications (
    user_id,
    template_key,
    ((payload ->> 'schedule_period_id'))
  )
  where template_key = 'schedule_published';

create or replace function public.publish_schedule_period(target_period_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  period_value public.schedule_periods%rowtype;
  published_shift_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into period_value
  from public.schedule_periods p
  where p.id = target_period_id
  for update;

  if period_value.id is null then raise exception 'Schedule period not found'; end if;
  if not (select private.has_org_role(
    period_value.organization_id,
    array['owner','admin','manager']::public.member_role[]
  )) then
    raise exception 'Manager permission required';
  end if;
  if period_value.status = 'archived' then raise exception 'Archived schedule cannot be published'; end if;

  select count(*)::integer into published_shift_count
  from public.shifts s
  where s.schedule_period_id = period_value.id
    and s.organization_id = period_value.organization_id
    and s.status <> 'cancelled';

  if published_shift_count = 0 then raise exception 'Cannot publish an empty schedule'; end if;

  update public.shifts
  set status = 'published', updated_at = now()
  where schedule_period_id = period_value.id
    and organization_id = period_value.organization_id
    and status <> 'cancelled';

  update public.schedule_periods
  set status = 'published',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = period_value.id;

  insert into public.notifications (
    organization_id,
    user_id,
    channel,
    template_key,
    payload,
    status,
    scheduled_for
  )
  select
    period_value.organization_id,
    membership.user_id,
    'in_app',
    'schedule_published',
    jsonb_build_object(
      'schedule_period_id', period_value.id,
      'year', period_value.year,
      'month', period_value.month,
      'branch_id', period_value.branch_id
    ),
    'pending',
    now()
  from public.organization_memberships membership
  where membership.organization_id = period_value.organization_id
    and membership.status = 'active'
  on conflict do nothing;

  return published_shift_count;
end;
$$;

create or replace function public.mark_my_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  changed_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  update public.notifications
  set read_at = coalesce(read_at, now()),
      status = case when status = 'pending' then 'sent' else status end
  where user_id = current_user_id
    and channel = 'in_app'
    and read_at is null;

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on function public.mark_my_notifications_read() from public, anon;
grant execute on function public.mark_my_notifications_read() to authenticated;

comment on column public.notifications.read_at
  is 'When an in-app notification was marked as read by its recipient.';
comment on function public.mark_my_notifications_read()
  is 'Marks only the authenticated user in-app notifications as read.';
