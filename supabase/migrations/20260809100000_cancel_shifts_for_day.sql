-- Let a manager cancel every shift on a given day in one action -- e.g. an
-- unexpected closure, a holiday, a branch shutting early for the day.
--
-- Gap: 'cancelled' has been a first-class shift_status value all along
-- (the overlap-prevention trigger and duplicate_schedule_period both
-- already exclude cancelled shifts), but nothing in the UI could ever
-- reach it -- there was no way to cancel a shift at all, one at a time or
-- in bulk.
--
-- Bulk by day, not by individual shift: the real-world trigger for this
-- is almost always "the business isn't open that day", which affects
-- every shift on it at once, not one shift template in isolation.
--
-- Removes the day's shift_assignments before marking the shifts
-- cancelled, so a cancelled shift never keeps showing an employee as
-- still assigned to it (their published my-shifts view already only
-- shows status = 'published' shifts, but the assignment row itself
-- would otherwise dangle and still count toward the schedule builder's
-- "filled" tally). Works regardless of period or shift status --
-- cancellation is precisely for reacting to something after the fact,
-- including after publishing.
--
-- Tested live: cancelled 2 of 3 test shifts sharing an org+period (one
-- draft, one published, both on the same date, one with a real
-- assignment) -- confirmed both flipped to 'cancelled', the assignment
-- was removed, and the third shift on the following day was untouched.
-- Re-ran on the same day afterward and confirmed it correctly no-ops
-- (0 cancelled, 0 removed) instead of erroring. All test data removed
-- afterward.

create or replace function public.cancel_shifts_for_day(target_period_id uuid, target_date date)
returns table(shifts_cancelled integer, assignments_removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  period_value public.schedule_periods%rowtype;
  v_shifts_cancelled integer := 0;
  v_assignments_removed integer := 0;
  removed_count integer;
  rec record;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into period_value from public.schedule_periods where id = target_period_id for update;
  if period_value.id is null then raise exception 'Schedule period not found'; end if;
  if not (select private.has_org_role(
    period_value.organization_id,
    array['owner','admin','manager']::public.member_role[]
  )) then
    raise exception 'Manager permission required';
  end if;

  for rec in
    select id from public.shifts
    where schedule_period_id = period_value.id
      and shift_date = target_date
      and status <> 'cancelled'
    for update
  loop
    delete from public.shift_assignments where shift_id = rec.id;
    get diagnostics removed_count = row_count;
    v_assignments_removed := v_assignments_removed + removed_count;

    update public.shifts set status = 'cancelled', updated_at = now() where id = rec.id;
    v_shifts_cancelled := v_shifts_cancelled + 1;
  end loop;

  return query select v_shifts_cancelled, v_assignments_removed;
end;
$$;

revoke all on function public.cancel_shifts_for_day(uuid, date) from public, anon;
grant execute on function public.cancel_shifts_for_day(uuid, date) to authenticated;

comment on function public.cancel_shifts_for_day(uuid, date)
  is 'Cancels every not-yet-cancelled shift on target_date within target_period_id and removes their assignments. Manager/admin/owner only.';
