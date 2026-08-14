-- Scope shift templates and schedule periods to departments. Existing rows
-- move to the default department created by the departments foundation.

alter table public.shift_templates add column department_id uuid;
alter table public.schedule_periods add column department_id uuid;

update public.shift_templates template
set department_id = department.id
from public.departments department
where department.organization_id = template.organization_id
  and department.branch_id = template.branch_id
  and department.name = 'מחלקה כללית';

update public.schedule_periods period
set department_id = department.id
from public.departments department
where department.organization_id = period.organization_id
  and department.branch_id = period.branch_id
  and department.name = 'מחלקה כללית';

alter table public.shift_templates alter column department_id set not null;
alter table public.schedule_periods alter column department_id set not null;

alter table public.shift_templates
  add constraint shift_templates_department_scope_fkey
  foreign key (department_id, organization_id, branch_id)
  references public.departments(id, organization_id, branch_id);

alter table public.schedule_periods
  add constraint schedule_periods_department_scope_fkey
  foreign key (department_id, organization_id, branch_id)
  references public.departments(id, organization_id, branch_id);

alter table public.shift_templates
  drop constraint shift_templates_organization_id_branch_id_name_key;
alter table public.shift_templates
  add constraint shift_templates_department_name_key
  unique (organization_id, branch_id, department_id, name);

alter table public.schedule_periods
  drop constraint schedule_periods_organization_id_branch_id_year_month_key;
alter table public.schedule_periods
  add constraint schedule_periods_department_month_key
  unique (organization_id, branch_id, department_id, year, month);

create index shift_templates_department_idx
  on public.shift_templates(organization_id, branch_id, department_id) where active;
create index schedule_periods_department_month_idx
  on public.schedule_periods(organization_id, branch_id, department_id, year, month);

create or replace function private.can_access_schedule_period(target_period_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.schedule_periods period
    where period.id = target_period_id
      and (select private.can_access_department(period.department_id))
  );
$$;

create or replace function private.can_manage_schedule_period(target_period_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.schedule_periods period
    where period.id = target_period_id
      and (select private.can_manage_department(period.department_id))
  );
$$;

revoke all on function private.can_access_schedule_period(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_schedule_period(uuid) from public, anon, authenticated;

create or replace function private.enforce_template_period_department()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  template_department uuid;
  period_department uuid;
begin
  select department_id into template_department from public.shift_templates
  where id = new.shift_template_id and organization_id = new.organization_id;
  select period.department_id into period_department
  from public.availability_submissions submission
  join public.schedule_periods period on period.id = submission.schedule_period_id
  where submission.id = new.submission_id
    and submission.organization_id = new.organization_id;
  if template_department is null or period_department is null or template_department <> period_department then
    raise exception 'Shift template and availability period must belong to the same department';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_shift_period_department()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  template_department uuid;
  period_department uuid;
begin
  if new.shift_template_id is null then return new; end if;
  select department_id into template_department from public.shift_templates
  where id = new.shift_template_id and organization_id = new.organization_id;
  select department_id into period_department from public.schedule_periods
  where id = new.schedule_period_id and organization_id = new.organization_id;
  if template_department is null or period_department is null or template_department <> period_department then
    raise exception 'Shift template and schedule period must belong to the same department';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_assignment_department()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  period_value public.schedule_periods%rowtype;
begin
  select period.* into period_value
  from public.shifts shift
  join public.schedule_periods period on period.id = shift.schedule_period_id
  where shift.id = new.shift_id and shift.organization_id = new.organization_id;
  if period_value.id is null or not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.user_id
      and membership.status = 'active'
      and (
        membership.access_scope = 'organization'
        or (membership.access_scope = 'branch' and membership.branch_id = period_value.branch_id)
        or exists (
          select 1 from public.department_memberships department_membership
          where department_membership.membership_id = membership.id
            and department_membership.department_id = period_value.department_id
        )
      )
  ) then
    raise exception 'Assigned worker must belong to the schedule department';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_template_period_department() from public, anon, authenticated;
revoke all on function private.enforce_shift_period_department() from public, anon, authenticated;
revoke all on function private.enforce_assignment_department() from public, anon, authenticated;

create trigger enforce_template_period_department
before insert or update of shift_template_id, submission_id on public.availability_entries
for each row execute function private.enforce_template_period_department();
create trigger enforce_shift_period_department
before insert or update of shift_template_id, schedule_period_id on public.shifts
for each row execute function private.enforce_shift_period_department();
create trigger enforce_assignment_department
before insert or update of shift_id, user_id on public.shift_assignments
for each row execute function private.enforce_assignment_department();

drop policy if exists templates_select_member on public.shift_templates;
drop policy if exists templates_insert_manager on public.shift_templates;
drop policy if exists templates_update_manager on public.shift_templates;
drop policy if exists templates_delete_manager on public.shift_templates;

create policy templates_select_scoped on public.shift_templates
for select to authenticated
using ((select private.can_access_department(shift_templates.department_id)));
create policy templates_insert_scoped on public.shift_templates
for insert to authenticated
with check ((select private.can_manage_department(shift_templates.department_id)));
create policy templates_update_scoped on public.shift_templates
for update to authenticated
using ((select private.can_manage_department(shift_templates.department_id)))
with check ((select private.can_manage_department(shift_templates.department_id)));
create policy templates_delete_scoped on public.shift_templates
for delete to authenticated
using ((select private.can_manage_department(shift_templates.department_id)));

drop policy if exists periods_select_member on public.schedule_periods;
drop policy if exists periods_insert_manager on public.schedule_periods;
drop policy if exists periods_update_manager on public.schedule_periods;
drop policy if exists periods_delete_manager on public.schedule_periods;

create policy periods_select_scoped on public.schedule_periods
for select to authenticated
using ((select private.can_access_department(schedule_periods.department_id)));
create policy periods_insert_scoped on public.schedule_periods
for insert to authenticated
with check ((select private.can_manage_department(schedule_periods.department_id)));
create policy periods_update_scoped on public.schedule_periods
for update to authenticated
using ((select private.can_manage_department(schedule_periods.department_id)))
with check ((select private.can_manage_department(schedule_periods.department_id)));
create policy periods_delete_scoped on public.schedule_periods
for delete to authenticated
using ((select private.can_manage_department(schedule_periods.department_id)));

drop policy if exists shifts_select_allowed on public.shifts;
create policy shifts_select_allowed on public.shifts
for select to authenticated
using (exists (
  select 1 from public.schedule_periods period
  where period.id = shifts.schedule_period_id
    and period.organization_id = shifts.organization_id
    and (
      (select private.can_manage_department(period.department_id))
      or (shifts.status = 'published' and (select private.can_access_department(period.department_id)))
    )
));

drop policy if exists shifts_insert_manager on public.shifts;
drop policy if exists shifts_update_manager on public.shifts;
drop policy if exists shifts_delete_manager on public.shifts;
create policy shifts_insert_scoped on public.shifts for insert to authenticated
with check (exists (
  select 1 from public.schedule_periods period
  where period.id = shifts.schedule_period_id
    and period.organization_id = shifts.organization_id
    and (select private.can_manage_department(period.department_id))
));
create policy shifts_update_scoped on public.shifts for update to authenticated
using (exists (
  select 1 from public.schedule_periods period
  where period.id = shifts.schedule_period_id
    and period.organization_id = shifts.organization_id
    and (select private.can_manage_department(period.department_id))
))
with check (exists (
  select 1 from public.schedule_periods period
  where period.id = shifts.schedule_period_id
    and period.organization_id = shifts.organization_id
    and (select private.can_manage_department(period.department_id))
));
create policy shifts_delete_scoped on public.shifts for delete to authenticated
using (exists (
  select 1 from public.schedule_periods period
  where period.id = shifts.schedule_period_id
    and period.organization_id = shifts.organization_id
    and (select private.can_manage_department(period.department_id))
));

drop policy if exists submissions_select_allowed on public.availability_submissions;
drop policy if exists submissions_insert_self on public.availability_submissions;
drop policy if exists submissions_update_allowed on public.availability_submissions;
create policy submissions_select_scoped on public.availability_submissions for select to authenticated
using (
  (user_id = (select auth.uid()) and (select private.can_access_schedule_period(schedule_period_id)))
  or (select private.can_manage_schedule_period(schedule_period_id))
);
create policy submissions_insert_scoped on public.availability_submissions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_access_schedule_period(schedule_period_id))
);
create policy submissions_update_scoped on public.availability_submissions for update to authenticated
using (
  (user_id = (select auth.uid()) and (select private.can_access_schedule_period(schedule_period_id)))
  or (select private.can_manage_schedule_period(schedule_period_id))
)
with check (
  (user_id = (select auth.uid()) and (select private.can_access_schedule_period(schedule_period_id)))
  or (select private.can_manage_schedule_period(schedule_period_id))
);

drop policy if exists availability_select_allowed on public.availability_entries;
create policy availability_select_scoped on public.availability_entries for select to authenticated
using (exists (
  select 1 from public.availability_submissions submission
  where submission.id = availability_entries.submission_id
    and submission.organization_id = availability_entries.organization_id
    and (
      (submission.user_id = (select auth.uid()) and (select private.can_access_schedule_period(submission.schedule_period_id)))
      or (select private.can_manage_schedule_period(submission.schedule_period_id))
    )
));

drop policy if exists assignments_select_allowed on public.shift_assignments;
drop policy if exists assignments_insert_manager on public.shift_assignments;
drop policy if exists assignments_update_manager on public.shift_assignments;
drop policy if exists assignments_delete_manager on public.shift_assignments;
create policy assignments_select_scoped on public.shift_assignments for select to authenticated
using (exists (
  select 1 from public.shifts shift
  join public.schedule_periods period
    on period.id = shift.schedule_period_id
   and period.organization_id = shift.organization_id
  where shift.id = shift_assignments.shift_id
    and shift.organization_id = shift_assignments.organization_id
    and (
      (select private.can_manage_department(period.department_id))
      or (shift.status = 'published' and (select private.can_access_department(period.department_id)))
    )
));
create policy assignments_insert_scoped on public.shift_assignments for insert to authenticated
with check (exists (
  select 1 from public.shifts shift
  join public.schedule_periods period on period.id = shift.schedule_period_id
  where shift.id = shift_assignments.shift_id
    and shift.organization_id = shift_assignments.organization_id
    and (select private.can_manage_department(period.department_id))
));
create policy assignments_update_scoped on public.shift_assignments for update to authenticated
using (exists (
  select 1 from public.shifts shift
  join public.schedule_periods period on period.id = shift.schedule_period_id
  where shift.id = shift_assignments.shift_id
    and shift.organization_id = shift_assignments.organization_id
    and (select private.can_manage_department(period.department_id))
))
with check (exists (
  select 1 from public.shifts shift
  join public.schedule_periods period on period.id = shift.schedule_period_id
  where shift.id = shift_assignments.shift_id
    and shift.organization_id = shift_assignments.organization_id
    and (select private.can_manage_department(period.department_id))
));
create policy assignments_delete_scoped on public.shift_assignments for delete to authenticated
using (exists (
  select 1 from public.shifts shift
  join public.schedule_periods period on period.id = shift.schedule_period_id
  where shift.id = shift_assignments.shift_id
    and shift.organization_id = shift_assignments.organization_id
    and (select private.can_manage_department(period.department_id))
));

comment on column public.shift_templates.department_id is
  'Department that owns this reusable shift definition.';
comment on column public.schedule_periods.department_id is
  'Department whose employees submit availability and receive this schedule.';
