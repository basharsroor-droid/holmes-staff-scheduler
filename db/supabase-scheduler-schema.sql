-- ShiftPilot SaaS foundation
-- Designed for a dedicated Supabase project. Every business record is tenant-scoped.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'manager', 'employee');
create type public.member_status as enum ('invited', 'active', 'suspended');
create type public.schedule_status as enum ('collecting', 'draft', 'published', 'archived');
create type public.availability_status as enum ('available', 'preferred', 'only_if_needed', 'unavailable');
create type public.shift_status as enum ('draft', 'published', 'cancelled');
create type public.swap_status as enum ('pending_employee', 'pending_manager', 'approved', 'rejected', 'cancelled');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'Asia/Jerusalem',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  phone text,
  color text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'employee',
  status public.member_status not null default 'invited',
  employee_number text,
  seniority_level text not null default 'regular' check (seniority_level in ('new', 'regular', 'senior', 'shift_lead')),
  can_open boolean not null default false,
  can_close boolean not null default false,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, organization_id) references public.branches(id, organization_id),
  unique (organization_id, user_id)
);

create table public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  shift_type text not null check (shift_type in ('opening', 'middle', 'middle_2', 'closing', 'custom')),
  start_time time not null,
  end_time time not null,
  required_employees integer not null default 1 check (required_employees between 1 and 100),
  requires_senior_employee boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, organization_id) references public.branches(id, organization_id),
  unique (organization_id, branch_id, name),
  unique (id, organization_id)
);

create table public.schedule_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  year smallint not null check (year between 2020 and 2100),
  month smallint not null check (month between 1 and 12),
  status public.schedule_status not null default 'collecting',
  submission_opens_at timestamptz not null,
  submission_closes_at timestamptz not null,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, organization_id) references public.branches(id, organization_id),
  check (submission_closes_at > submission_opens_at),
  unique (organization_id, branch_id, year, month),
  unique (id, organization_id)
);

create table public.availability_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  schedule_period_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz,
  manager_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (schedule_period_id, organization_id) references public.schedule_periods(id, organization_id) on delete cascade,
  unique (schedule_period_id, user_id),
  unique (id, organization_id)
);

create table public.availability_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  submission_id uuid not null,
  shift_template_id uuid not null,
  shift_date date not null,
  status public.availability_status not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (submission_id, organization_id) references public.availability_submissions(id, organization_id) on delete cascade,
  foreign key (shift_template_id, organization_id) references public.shift_templates(id, organization_id) on delete cascade,
  unique (submission_id, shift_date, shift_template_id)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  schedule_period_id uuid not null,
  shift_template_id uuid,
  shift_date date not null,
  name text not null,
  start_time time not null,
  end_time time not null,
  required_employees integer not null default 1 check (required_employees between 1 and 100),
  status public.shift_status not null default 'draft',
  manager_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (schedule_period_id, organization_id) references public.schedule_periods(id, organization_id) on delete cascade,
  foreign key (shift_template_id, organization_id) references public.shift_templates(id, organization_id) on delete set null,
  unique (id, organization_id),
  unique (schedule_period_id, shift_date, name)
);

create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (shift_id, organization_id) references public.shifts(id, organization_id) on delete cascade,
  unique (shift_id, user_id),
  unique (id, organization_id)
);

create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  original_assignment_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_shift_id uuid,
  status public.swap_status not null default 'pending_employee',
  reason text not null check (char_length(reason) between 2 and 500),
  manager_note text check (char_length(manager_note) <= 500),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (original_assignment_id, organization_id) references public.shift_assignments(id, organization_id) on delete cascade,
  foreign key (target_shift_id, organization_id) references public.shifts(id, organization_id) on delete set null,
  unique (id, organization_id)
);

create table public.swap_request_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  swap_request_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (swap_request_id, organization_id) references public.swap_requests(id, organization_id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'in_app')),
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_id_idx on public.organization_memberships(user_id);
create index memberships_org_role_idx on public.organization_memberships(organization_id, role, status);
create index branches_org_idx on public.branches(organization_id);
create index templates_branch_idx on public.shift_templates(organization_id, branch_id);
create index periods_branch_month_idx on public.schedule_periods(organization_id, branch_id, year, month);
create index submissions_user_idx on public.availability_submissions(user_id, schedule_period_id);
create index availability_date_idx on public.availability_entries(organization_id, shift_date);
create index shifts_period_date_idx on public.shifts(schedule_period_id, shift_date);
create index assignments_user_idx on public.shift_assignments(user_id, shift_id);
create index swaps_status_idx on public.swap_requests(organization_id, status);
create index notifications_queue_idx on public.notifications(status, scheduled_for);
create index audit_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index audit_actor_idx on public.audit_logs(actor_user_id);
create index availability_submission_org_idx on public.availability_submissions(organization_id);
create index availability_submission_period_org_idx on public.availability_submissions(schedule_period_id, organization_id);
create index availability_entry_submission_org_idx on public.availability_entries(submission_id, organization_id);
create index availability_entry_template_org_idx on public.availability_entries(shift_template_id, organization_id);
create index membership_branch_org_idx on public.organization_memberships(branch_id, organization_id);
create index notification_org_idx on public.notifications(organization_id);
create index notification_user_idx on public.notifications(user_id);
create index period_branch_org_idx on public.schedule_periods(branch_id, organization_id);
create index period_creator_idx on public.schedule_periods(created_by);
create index assignment_shift_org_idx on public.shift_assignments(shift_id, organization_id);
create index assignment_org_idx on public.shift_assignments(organization_id);
create index assignment_actor_idx on public.shift_assignments(assigned_by);
create index template_branch_org_idx on public.shift_templates(branch_id, organization_id);
create index shift_org_idx on public.shifts(organization_id);
create index shift_period_org_idx on public.shifts(schedule_period_id, organization_id);
create index shift_template_org_idx on public.shifts(shift_template_id, organization_id);
create index swap_event_org_idx on public.swap_request_events(organization_id);
create index swap_event_request_org_idx on public.swap_request_events(swap_request_id, organization_id);
create index swap_event_actor_idx on public.swap_request_events(actor_user_id);
create index swap_assignment_org_idx on public.swap_requests(original_assignment_id, organization_id);
create index swap_target_shift_org_idx on public.swap_requests(target_shift_id, organization_id);
create index swap_requested_by_idx on public.swap_requests(requested_by);
create index swap_target_user_idx on public.swap_requests(target_user_id);
create index swap_decided_by_idx on public.swap_requests(decided_by);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.has_org_role(target_organization_id uuid, allowed_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any (allowed_roles)
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.member_role[]) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.member_role[]) to authenticated;

create or replace function public.create_organization_workspace(
  business_name text,
  organization_slug text,
  first_branch_name text,
  owner_first_name text,
  owner_last_name text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_organization_id uuid;
  new_branch_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(business_name)) < 2 or char_length(trim(business_name)) > 120 then
    raise exception 'Business name must contain 2-120 characters';
  end if;
  if organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid organization slug';
  end if;
  if char_length(trim(first_branch_name)) < 2 or char_length(trim(first_branch_name)) > 120 then
    raise exception 'Branch name must contain 2-120 characters';
  end if;
  if char_length(trim(owner_first_name)) < 1 or char_length(trim(owner_first_name)) > 80 then
    raise exception 'Invalid owner first name';
  end if;

  insert into public.profiles (id, first_name, last_name)
  values (current_user_id, trim(owner_first_name), trim(owner_last_name))
  on conflict (id) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now();

  insert into public.organizations (name, slug)
  values (trim(business_name), organization_slug)
  returning id into new_organization_id;

  insert into public.branches (organization_id, name)
  values (new_organization_id, trim(first_branch_name))
  returning id into new_branch_id;

  insert into public.organization_memberships (
    organization_id, branch_id, user_id, role, status, joined_at
  ) values (
    new_organization_id, new_branch_id, current_user_id, 'owner', 'active', now()
  );

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization_workspace(text, text, text, text, text) from public;
revoke all on function public.create_organization_workspace(text, text, text, text, text) from anon;
grant execute on function public.create_organization_workspace(text, text, text, text, text) to authenticated;

alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.shift_templates enable row level security;
alter table public.schedule_periods enable row level security;
alter table public.availability_submissions enable row level security;
alter table public.availability_entries enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.swap_requests enable row level security;
alter table public.swap_request_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select_member on public.organizations for select to authenticated
using ((select private.is_org_member(id)));
create policy organizations_update_admin on public.organizations for update to authenticated
using ((select private.has_org_role(id, array['owner','admin']::public.member_role[])))
with check ((select private.has_org_role(id, array['owner','admin']::public.member_role[])));

create policy branches_select_member on public.branches for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy branches_insert_admin on public.branches for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));
create policy branches_update_admin on public.branches for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));
create policy branches_delete_admin on public.branches for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));

create policy profiles_select_allowed on public.profiles for select to authenticated
using (
  id = (select auth.uid()) or exists (
    select 1 from public.organization_memberships target_membership
    where target_membership.user_id = profiles.id
      and (select private.has_org_role(target_membership.organization_id, array['owner','admin','manager']::public.member_role[]))
  )
);
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy memberships_select_allowed on public.organization_memberships for select to authenticated
using (
  user_id = (select auth.uid()) or
  (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
);
create policy memberships_insert_admin on public.organization_memberships for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));
create policy memberships_update_admin on public.organization_memberships for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));
create policy memberships_delete_admin on public.organization_memberships for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));

create policy templates_select_member on public.shift_templates for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy templates_insert_manager on public.shift_templates for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy templates_update_manager on public.shift_templates for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy templates_delete_manager on public.shift_templates for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

create policy periods_select_member on public.schedule_periods for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy periods_insert_manager on public.schedule_periods for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy periods_update_manager on public.schedule_periods for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy periods_delete_manager on public.schedule_periods for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

create policy submissions_select_allowed on public.availability_submissions for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy submissions_insert_self on public.availability_submissions for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)));
create policy submissions_update_allowed on public.availability_submissions for update to authenticated
using (user_id = (select auth.uid()) or (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])))
with check (user_id = (select auth.uid()) or (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

create policy availability_select_allowed on public.availability_entries for select to authenticated
using (
  exists (select 1 from public.availability_submissions submission where submission.id = submission_id and submission.user_id = (select auth.uid()))
  or (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
);
create policy availability_insert_self on public.availability_entries for insert to authenticated
with check (exists (select 1 from public.availability_submissions submission where submission.id = submission_id and submission.user_id = (select auth.uid())));
create policy availability_update_self on public.availability_entries for update to authenticated
using (exists (select 1 from public.availability_submissions submission where submission.id = submission_id and submission.user_id = (select auth.uid())))
with check (exists (select 1 from public.availability_submissions submission where submission.id = submission_id and submission.user_id = (select auth.uid())));
create policy availability_delete_self on public.availability_entries for delete to authenticated
using (exists (select 1 from public.availability_submissions submission where submission.id = submission_id and submission.user_id = (select auth.uid())));

create policy shifts_select_member on public.shifts for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy shifts_insert_manager on public.shifts for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy shifts_update_manager on public.shifts for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy shifts_delete_manager on public.shifts for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

create policy assignments_select_member on public.shift_assignments for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy assignments_insert_manager on public.shift_assignments for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy assignments_update_manager on public.shift_assignments for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy assignments_delete_manager on public.shift_assignments for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

create policy swaps_select_allowed on public.swap_requests for select to authenticated
using (
  requested_by = (select auth.uid()) or target_user_id = (select auth.uid()) or
  (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
);
create policy swaps_insert_self on public.swap_requests for insert to authenticated
with check (requested_by = (select auth.uid()) and (select private.is_org_member(organization_id)));
create policy swaps_update_allowed on public.swap_requests for update to authenticated
using (
  requested_by = (select auth.uid()) or target_user_id = (select auth.uid()) or
  (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
)
with check ((select private.is_org_member(organization_id)));

create policy swap_events_select_allowed on public.swap_request_events for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy swap_events_insert_allowed on public.swap_request_events for insert to authenticated
with check ((select private.is_org_member(organization_id)) and actor_user_id = (select auth.uid()));

create policy notifications_select_allowed on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy notifications_insert_manager on public.notifications for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy notifications_update_manager on public.notifications for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));
create policy notifications_delete_manager on public.notifications for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

create policy audit_select_admin on public.audit_logs for select to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::public.member_role[])));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
