-- Upgrade the existing self-service leave ranges into a real Time Off workflow.
-- Existing rows are preserved as approved so current schedule behavior does not change.

create type public.leave_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

alter table public.leave_requests
  add column status public.leave_request_status,
  add column manager_note text check (manager_note is null or char_length(manager_note) <= 500),
  add column decided_by uuid references auth.users(id) on delete set null,
  add column decided_at timestamptz,
  add column cancelled_at timestamptz;

update public.leave_requests
set status = 'approved',
    decided_at = coalesce(updated_at, created_at)
where status is null;

alter table public.leave_requests
  alter column status set default 'pending',
  alter column status set not null;

create index leave_requests_org_status_dates_idx
  on public.leave_requests (organization_id, status, start_date, end_date);

-- Employees may only create pending requests for themselves. This prevents a
-- crafted client from inserting an already-approved request.
drop policy if exists leave_requests_insert_self on public.leave_requests;
create policy leave_requests_insert_self on public.leave_requests
for insert to authenticated
with check (
  leave_requests.user_id = (select auth.uid())
  and leave_requests.status = 'pending'
  and leave_requests.manager_note is null
  and leave_requests.decided_by is null
  and leave_requests.decided_at is null
  and leave_requests.cancelled_at is null
  and (select private.is_org_member(leave_requests.organization_id))
);

-- Pending/rejected requests can be removed by their owner. Approved leave must
-- go through the explicit cancellation RPC so the change is auditable.
drop policy if exists leave_requests_delete_self on public.leave_requests;
create policy leave_requests_delete_self on public.leave_requests
for delete to authenticated
using (
  leave_requests.user_id = (select auth.uid())
  and leave_requests.status in ('pending', 'rejected', 'cancelled')
);

create or replace function public.decide_leave_request(
  target_request_id uuid,
  decision public.leave_request_status,
  decision_note text default null
)
returns public.leave_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_row public.leave_requests;
  target_membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into request_row
  from public.leave_requests
  where id = target_request_id
  for update;

  if request_row.id is null then
    raise exception 'Leave request not found';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only pending leave requests can be decided';
  end if;

  select membership.id into target_membership_id
  from public.organization_memberships membership
  where membership.organization_id = request_row.organization_id
    and membership.user_id = request_row.user_id
    and membership.status = 'active'
  limit 1;

  if target_membership_id is null
     or not (select private.can_access_membership(target_membership_id)) then
    raise exception 'Not authorized to decide this leave request';
  end if;

  if not exists (
    select 1
    from public.organization_memberships caller
    where caller.organization_id = request_row.organization_id
      and caller.user_id = current_user_id
      and caller.status = 'active'
      and caller.role in ('owner', 'admin', 'manager')
  ) then
    raise exception 'Manager role required';
  end if;

  update public.leave_requests
  set status = decision,
      manager_note = nullif(trim(decision_note), ''),
      decided_by = current_user_id,
      decided_at = now(),
      cancelled_at = null,
      updated_at = now()
  where id = target_request_id
  returning * into request_row;

  return request_row;
end;
$$;

create or replace function public.cancel_leave_request(target_request_id uuid)
returns public.leave_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_row public.leave_requests;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into request_row
  from public.leave_requests
  where id = target_request_id
  for update;

  if request_row.id is null then
    raise exception 'Leave request not found';
  end if;

  if request_row.user_id <> current_user_id then
    raise exception 'Only the employee who submitted this request can cancel it';
  end if;

  if request_row.status not in ('pending', 'approved') then
    raise exception 'This leave request cannot be cancelled';
  end if;

  update public.leave_requests
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where id = target_request_id
  returning * into request_row;

  return request_row;
end;
$$;

revoke all on function public.decide_leave_request(uuid, public.leave_request_status, text) from public, anon;
revoke all on function public.cancel_leave_request(uuid) from public, anon;
grant execute on function public.decide_leave_request(uuid, public.leave_request_status, text) to authenticated;
grant execute on function public.cancel_leave_request(uuid) to authenticated;

-- Approved time off is a hard scheduling constraint. This protects against
-- stale browser state and direct API writes, not just mistakes in the UI.
create or replace function private.prevent_assignment_during_approved_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_date date;
begin
  select shift.shift_date into assignment_date
  from public.shifts shift
  where shift.id = new.shift_id
    and shift.organization_id = new.organization_id;

  if assignment_date is null then
    raise exception 'Shift not found for assignment';
  end if;

  if exists (
    select 1
    from public.leave_requests request
    where request.organization_id = new.organization_id
      and request.user_id = new.user_id
      and request.status = 'approved'
      and assignment_date between request.start_date and request.end_date
  ) then
    raise exception 'Employee has approved time off on this date';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_assignment_during_approved_leave() from public, anon, authenticated;

drop trigger if exists prevent_assignment_during_approved_leave on public.shift_assignments;
create trigger prevent_assignment_during_approved_leave
before insert or update of shift_id, user_id on public.shift_assignments
for each row execute function private.prevent_assignment_during_approved_leave();

comment on table public.leave_requests is
  'Employee Time Off requests. New requests require manager approval; only approved requests block scheduling.';
comment on function public.decide_leave_request(uuid, public.leave_request_status, text) is
  'Scoped manager approval/rejection for Time Off requests.';
comment on function public.cancel_leave_request(uuid) is
  'Lets an employee cancel their own pending or approved Time Off request with an auditable status transition.';
