-- Publish a schedule and its period atomically.

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

  return published_shift_count;
end;
$$;

revoke all on function public.publish_schedule_period(uuid) from public, anon;
grant execute on function public.publish_schedule_period(uuid) to authenticated;

comment on function public.publish_schedule_period(uuid)
  is 'Manager-only atomic publication of a non-empty schedule period and all non-cancelled shifts.';
