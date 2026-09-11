-- Employees can see the names of colleagues in their own department.
--
-- An employee (access_scope 'self') can read only their own profile, so the
-- shift-swap screen labelled every colleague's shift "עובד/ת" -- the employee
-- could not tell whom they were asking to swap with. Found by the staging
-- workspace E2E flow; product decision 2026-09-11: same-department colleagues'
-- names are visible.
--
-- profiles also holds phone, so the row-level policy is NOT widened. This
-- function returns only display fields (name + colour) for active members who
-- share at least one department with the caller, in the caller's organization.

create or replace function public.department_colleague_names()
returns table (id uuid, first_name text, last_name text, color text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct profile.id, profile.first_name, profile.last_name, profile.color
  from public.organization_memberships caller
  join public.department_memberships caller_department
    on caller_department.membership_id = caller.id
  join public.department_memberships colleague_department
    on colleague_department.department_id = caller_department.department_id
  join public.organization_memberships colleague
    on colleague.id = colleague_department.membership_id
   and colleague.organization_id = caller.organization_id
   and colleague.status = 'active'
  join public.profiles profile
    on profile.id = colleague.user_id
  where caller.user_id = (select auth.uid())
    and caller.status = 'active';
$$;

revoke all on function public.department_colleague_names() from public, anon;
grant execute on function public.department_colleague_names() to authenticated;

comment on function public.department_colleague_names() is
  'Display names (no phone) of active colleagues sharing a department with the caller. Used by the shift-swap screen.';
