-- B1 from docs/REMEDIATION_PLAN.md (Wave 1).
--
-- Smart Replacement (app/workspace/schedule-builder/smart-replacement-panel.tsx)
-- swapped an employee on a draft shift from the browser as two statements --
-- delete the outgoing assignment, then insert the incoming one -- with no
-- transaction and no lock, plus a hand-rolled "re-insert the original" if the
-- insert failed. If that compensating insert failed too (a dropped connection,
-- a trigger rejection), the outgoing employee silently vanished from the shift.
-- It was the only path in the product that changed assignments without an RPC.
--
-- This performs the same replacement atomically:
--   * locks the shift FOR UPDATE, so two replacements on it serialise;
--   * locks the period FOR SHARE, so publish_schedule_period (which takes
--     FOR UPDATE on the period) cannot publish mid-replacement, and vice versa;
--   * re-checks, after locking, everything that can change between the manager
--     ranking candidates and confirming: period not published or archived, shift
--     not cancelled, outgoing still assigned, incoming not already assigned;
--   * deletes and inserts in one transaction. The BEFORE INSERT triggers on
--     shift_assignments -- enforce_assignment_department (an active member with
--     access to the schedule's department), prevent_assignment_during_approved_leave
--     and shift_assignment_overlap_check -- run on the insert, and any exception
--     rolls the delete back with it. The outgoing employee can no longer be lost.
--     UNIQUE (shift_id, user_id) backstops the "already assigned" check.
--
-- Deliberately NOT enforced here: weekly_hours_limit and min_rest_hours. For
-- manager assignments those limits are advisory throughout the product -- the
-- schedule builder's own manual assignment does not enforce them in SQL either;
-- only the employee self-service marketplace does. Smart Replacement keeps
-- re-validating them client-side before calling this, exactly as it does today.
-- Enforcing them for managers would be a product decision, not part of this fix.

create or replace function public.replace_shift_assignment(
  target_shift_id uuid,
  outgoing_user_id uuid,
  incoming_user_id uuid
)
returns public.shift_assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  shift_value public.shifts%rowtype;
  period_value public.schedule_periods%rowtype;
  outgoing_assignment public.shift_assignments%rowtype;
  new_assignment public.shift_assignments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if outgoing_user_id is null or incoming_user_id is null or outgoing_user_id = incoming_user_id then
    raise exception 'A different replacement employee is required';
  end if;

  select * into shift_value
  from public.shifts shift
  where shift.id = target_shift_id
  for update;

  if shift_value.id is null then
    raise exception 'Shift not found';
  end if;

  select * into period_value
  from public.schedule_periods period
  where period.id = shift_value.schedule_period_id
    and period.organization_id = shift_value.organization_id
  for share;

  if not (select private.can_manage_schedule_period(period_value.id)) then
    raise exception 'Manager permission required for this department';
  end if;
  if period_value.status in ('published', 'archived') then
    raise exception 'Schedule period is published; unpublish it before replacing an employee';
  end if;
  if shift_value.status = 'cancelled' then
    raise exception 'Shift is cancelled';
  end if;

  select * into outgoing_assignment
  from public.shift_assignments assignment
  where assignment.shift_id = shift_value.id
    and assignment.user_id = outgoing_user_id
    and assignment.organization_id = shift_value.organization_id
  for update;

  if outgoing_assignment.id is null then
    raise exception 'Outgoing employee is no longer assigned to this shift';
  end if;
  if exists (
    select 1
    from public.shift_assignments assignment
    where assignment.shift_id = shift_value.id
      and assignment.user_id = incoming_user_id
  ) then
    raise exception 'Replacement employee is already assigned to this shift';
  end if;

  delete from public.shift_assignments
  where id = outgoing_assignment.id;

  insert into public.shift_assignments (organization_id, shift_id, user_id, assigned_by)
  values (shift_value.organization_id, shift_value.id, incoming_user_id, current_user_id)
  returning * into new_assignment;

  return new_assignment;
end;
$$;

revoke all on function public.replace_shift_assignment(uuid, uuid, uuid) from public, anon;
grant execute on function public.replace_shift_assignment(uuid, uuid, uuid) to authenticated;

comment on function public.replace_shift_assignment(uuid, uuid, uuid) is
  'Atomically replaces one employee with another on a draft shift (Smart Replacement). Locks the shift and period, re-validates after locking, and relies on the shift_assignments insert triggers for department, approved-leave and overlap rules. Weekly-hours and min-rest limits are not enforced here (advisory for manager assignments).';
