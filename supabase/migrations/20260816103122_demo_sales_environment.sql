-- Dedicated, resettable sales-demo tenant. Distinct from the existing
-- /demo Holmes Place environment (which is pilot-prep for a real
-- prospective customer) -- this is a repeatable, fictional-company
-- environment for showing the product to *new* leads without touching
-- real data, per docs/RUNBOOK.md and the P0-02 demo-workspace plan.

alter table public.organizations
  add column if not exists is_demo boolean not null default false;

comment on column public.organizations.is_demo is
  'Marks a resettable sales-demo tenant (fictional company, no real customer data). reset_demo_environment() refuses to run against any organization where this is false, as a safety net against accidentally wiping real tenant data.';

-- Wipes and rebuilds this org's *operational* data (schedule period,
-- shifts, assignments, availability, swap requests, notifications, the
-- support ticket) back to a fixed baseline. Deliberately does NOT touch
-- the organization, branches, departments, memberships, or shift
-- templates -- those stay stable so demo login credentials and the
-- org/branch/department structure never change between resets, only the
-- schedule data a visitor would actually poke at.
--
-- The schedule period always targets the *current* calendar month (not a
-- hardcoded date) so the demo never looks stale.
create or replace function public.reset_demo_environment(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org record;
  branch_tlv uuid;
  branch_haifa uuid;
  dept_reception uuid;
  dept_trainers uuid;
  dept_cleaning uuid;
  owner_user uuid;
  manager_user uuid;
  employee_user uuid;
  template_reception_open uuid;
  template_reception_close uuid;
  template_trainer_shift uuid;
  period_reception uuid;
  demo_year int;
  demo_month int;
  opens_at timestamptz;
  closes_at timestamptz;
  shift_day1 uuid;
  shift_day2 uuid;
  shift_day3 uuid;
  submission_employee uuid;
  assignment_day1 uuid;
begin
  select * into org from public.organizations where id = target_organization_id;
  if org.id is null then
    raise exception 'Organization % does not exist', target_organization_id;
  end if;
  if not org.is_demo then
    raise exception 'Refusing to reset organization % -- is_demo is false. This function only ever operates on the dedicated sales-demo tenant.', target_organization_id;
  end if;

  select id into branch_tlv from public.branches where organization_id = target_organization_id and name = 'סניף תל אביב';
  select id into branch_haifa from public.branches where organization_id = target_organization_id and name = 'סניף חיפה';
  select id into dept_reception from public.departments where organization_id = target_organization_id and branch_id = branch_tlv and name = 'קבלה ודלפק';
  select id into dept_trainers from public.departments where organization_id = target_organization_id and branch_id = branch_tlv and name = 'מאמנים אישיים';
  select id into dept_cleaning from public.departments where organization_id = target_organization_id and branch_id = branch_haifa and name = 'ניקיון ותחזוקה';

  if branch_tlv is null or dept_reception is null then
    raise exception 'Demo baseline structure (branches/departments) not found for organization %. Run scripts/seed-demo-environment.mjs first.', target_organization_id;
  end if;

  -- Several tables have triggers that enforce real end-user rules (e.g.
  -- "employees may only write their own availability, and only while the
  -- submission window is open"). Those are correct for the product but
  -- would block this function from seeding a *published, historical*
  -- baseline (a closed window, written on someone else's behalf). Since
  -- this function is SECURITY DEFINER and callable only by service_role
  -- to begin with, disabling triggers for the duration of this one
  -- transaction is a safe, narrowly-scoped bypass -- it reverts
  -- automatically at commit/rollback and touches no other code path.
  set local session_replication_role = replica;

  select user_id into owner_user from public.organization_memberships where organization_id = target_organization_id and role = 'owner' limit 1;
  select user_id into manager_user from public.organization_memberships where organization_id = target_organization_id and role = 'manager' limit 1;
  select user_id into employee_user from public.organization_memberships where organization_id = target_organization_id and role = 'employee' limit 1;

  select id into template_reception_open from public.shift_templates where organization_id = target_organization_id and department_id = dept_reception and name = 'פתיחה';
  select id into template_reception_close from public.shift_templates where organization_id = target_organization_id and department_id = dept_reception and name = 'סגירה';
  select id into template_trainer_shift from public.shift_templates where organization_id = target_organization_id and department_id = dept_trainers and name = 'אימונים';

  -- Wipe every operational row for this org, FK-dependents first.
  delete from public.swap_request_events where organization_id = target_organization_id;
  delete from public.swap_requests where organization_id = target_organization_id;
  delete from public.notifications where organization_id = target_organization_id;
  delete from public.support_tickets where organization_id = target_organization_id;
  delete from public.availability_entries where organization_id = target_organization_id;
  delete from public.availability_submissions where organization_id = target_organization_id;
  delete from public.shift_assignments where organization_id = target_organization_id;
  delete from public.shifts where organization_id = target_organization_id;
  delete from public.schedule_periods where organization_id = target_organization_id;

  -- Rebuild: one published schedule period for the current month, in the
  -- reception department, with a handful of realistic shifts and a mix of
  -- states (a swap request, missing availability, etc.) so a visitor sees
  -- a "lived-in" schedule rather than an empty shell.
  demo_year := extract(year from now())::int;
  demo_month := extract(month from now())::int;
  opens_at := date_trunc('month', now()) - interval '5 days';
  closes_at := date_trunc('month', now()) - interval '1 day';

  insert into public.schedule_periods (organization_id, branch_id, department_id, year, month, status, submission_opens_at, submission_closes_at, published_at, created_by)
  values (target_organization_id, branch_tlv, dept_reception, demo_year, demo_month, 'published', opens_at, closes_at, closes_at + interval '1 day', owner_user)
  returning id into period_reception;

  insert into public.shifts (organization_id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status)
  values (target_organization_id, period_reception, template_reception_open, date_trunc('month', now())::date + 2, 'פתיחה', '06:00', '14:00', 1, 'published')
  returning id into shift_day1;

  insert into public.shifts (organization_id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status)
  values (target_organization_id, period_reception, template_reception_close, date_trunc('month', now())::date + 2, 'סגירה', '14:00', '22:00', 1, 'published')
  returning id into shift_day2;

  insert into public.shifts (organization_id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status)
  values (target_organization_id, period_reception, template_reception_open, date_trunc('month', now())::date + 5, 'פתיחה', '06:00', '14:00', 1, 'published')
  returning id into shift_day3;

  if employee_user is not null then
    insert into public.shift_assignments (organization_id, shift_id, user_id, assigned_by)
    values (target_organization_id, shift_day1, employee_user, owner_user)
    returning id into assignment_day1;

    insert into public.shift_assignments (organization_id, shift_id, user_id, assigned_by)
    values (target_organization_id, shift_day3, employee_user, owner_user);
  end if;

  if manager_user is not null then
    insert into public.shift_assignments (organization_id, shift_id, user_id, assigned_by)
    values (target_organization_id, shift_day2, manager_user, owner_user);
  end if;

  -- One submitted availability so "מי הגיש / מי חסר" has something to show.
  if employee_user is not null then
    insert into public.availability_submissions (organization_id, schedule_period_id, user_id, submitted_at)
    values (target_organization_id, period_reception, employee_user, opens_at + interval '1 day')
    returning id into submission_employee;

    insert into public.availability_entries (organization_id, submission_id, shift_template_id, shift_date, status)
    values
      (target_organization_id, submission_employee, template_reception_open, date_trunc('month', now())::date + 2, 'preferred'),
      (target_organization_id, submission_employee, template_reception_open, date_trunc('month', now())::date + 5, 'available');
  end if;

  -- A pending swap request between the employee and manager, so the Swap
  -- workflow has something real to click through.
  if employee_user is not null and manager_user is not null and assignment_day1 is not null then
    insert into public.swap_requests (organization_id, original_assignment_id, requested_by, target_user_id, target_shift_id, status, reason)
    values (target_organization_id, assignment_day1, employee_user, manager_user, shift_day2, 'pending_manager', 'מבחן באוניברסיטה באותו יום');
  end if;

  -- One open support ticket demonstrating the customer-facing help center.
  if employee_user is not null then
    insert into public.support_tickets (organization_id, created_by, category, priority, subject, description, status, organization_name)
    values (target_organization_id, employee_user, 'other', 'normal', 'איך מבקשים החלפת משמרת?', 'ניסיתי להחליף משמרת עם עמית ולא הבנתי איך לאשר את זה מהצד שלי.', 'open', org.name);
  end if;
end;
$$;

revoke all on function public.reset_demo_environment(uuid) from public, anon, authenticated;
grant execute on function public.reset_demo_environment(uuid) to service_role;

comment on function public.reset_demo_environment(uuid) is
  'Wipes and rebuilds a demo organization''s schedule/availability/swap/ticket data back to a fixed baseline for the current month. Refuses to run unless the target organization has is_demo = true. Callable only by service_role (not exposed to any authenticated app user) -- intended to be run by scripts/seed-demo-environment.mjs or directly via the Supabase SQL editor, not from the product UI.';
