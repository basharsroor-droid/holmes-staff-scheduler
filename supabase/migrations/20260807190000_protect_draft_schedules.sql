-- Hide draft schedules and assignments from employees at the database boundary.

drop policy if exists shifts_select_member on public.shifts;
create policy shifts_select_allowed on public.shifts
for select to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['owner','admin','manager']::public.member_role[]
  ))
  or (
    status = 'published'
    and (select private.is_org_member(organization_id))
  )
);

drop policy if exists assignments_select_member on public.shift_assignments;
create policy assignments_select_allowed on public.shift_assignments
for select to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['owner','admin','manager']::public.member_role[]
  ))
  or (
    (select private.is_org_member(organization_id))
    and exists (
      select 1
      from public.shifts s
      where s.id = shift_assignments.shift_id
        and s.organization_id = shift_assignments.organization_id
        and s.status = 'published'
    )
  )
);

comment on policy shifts_select_allowed on public.shifts
  is 'Managers see all shifts; employees see published shifts in their organization only.';
comment on policy assignments_select_allowed on public.shift_assignments
  is 'Managers see all assignments; employees see assignments for published shifts only.';
