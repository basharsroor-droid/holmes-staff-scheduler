-- Give managers a way back out of a published schedule.
--
-- publish_schedule_period() has no inverse: once a schedule period is
-- published there was no supported way to revert it to draft (e.g. after
-- publishing too early, or discovering a coverage mistake right after
-- publishing). The only fallback was editing the database directly.
--
-- Mirrors publish_schedule_period()'s shape and permission check exactly
-- (same manager-role gate, same row lock, same organization scoping), and
-- only accepts a period whose status is currently 'published' -- moving it
-- and its published shifts back to 'draft'. schedule_periods already has an
-- audit trigger (audit_schedule_periods_write) that fires on this UPDATE,
-- so no separate audit_logs insert is needed here, matching
-- publish_schedule_period()'s own pattern.

create or replace function public.unpublish_schedule_period(target_period_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  period_value public.schedule_periods%rowtype;
  reverted_shift_count integer;
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
  if period_value.status <> 'published' then
    raise exception 'Only a published schedule can be unpublished';
  end if;

  update public.shifts
  set status = 'draft', updated_at = now()
  where schedule_period_id = period_value.id
    and organization_id = period_value.organization_id
    and status = 'published';
  get diagnostics reverted_shift_count = row_count;

  update public.schedule_periods
  set status = 'draft', updated_at = now()
  where id = period_value.id;

  return reverted_shift_count;
end;
$$;

revoke all on function public.unpublish_schedule_period(uuid) from public, anon;
grant execute on function public.unpublish_schedule_period(uuid) to authenticated;

comment on function public.unpublish_schedule_period(uuid)
  is 'Reverts a published schedule period (and its published shifts) back to draft. Manager/admin/owner only.';
