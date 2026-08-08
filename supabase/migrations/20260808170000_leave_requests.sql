-- Let an employee self-declare vacation/sick date ranges, and have the
-- schedule builder respect them, instead of the only "I'm out" signal
-- being the per-shift-template availability screen (which only covers
-- periods currently open for submission, and asks for one status per
-- shift template per day rather than a simple date range).
--
-- v1 is deliberately self-service with no manager approval step: a
-- leave_requests row is informational for scheduling, not a workflow that
-- needs a decision. Only the employee who owns a row can create or delete
-- it; managers can see everyone's in their organization (needed to plan
-- around it) but cannot edit or delete another member's row.

create type public.leave_type as enum ('vacation', 'sick');

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_date_range_valid check (end_date >= start_date)
);

create index leave_requests_org_user_dates_idx on public.leave_requests (organization_id, user_id, start_date, end_date);

alter table public.leave_requests enable row level security;

create policy leave_requests_select_allowed on public.leave_requests
  for select
  using (
    user_id = (select auth.uid())
    or (select private.has_org_role(leave_requests.organization_id, array['owner','admin','manager']::public.member_role[]))
  );

create policy leave_requests_insert_self on public.leave_requests
  for insert
  with check (
    user_id = (select auth.uid())
    and (select private.is_org_member(leave_requests.organization_id))
  );

create policy leave_requests_delete_self on public.leave_requests
  for delete
  using (user_id = (select auth.uid()));

drop trigger if exists audit_leave_requests_write on public.leave_requests;
create trigger audit_leave_requests_write
after insert or update or delete on public.leave_requests
for each row execute function private.write_management_audit_log();

comment on table public.leave_requests
  is 'Employee-declared vacation/sick date ranges. Self-service, informational for scheduling -- no manager approval step in v1. schedule-builder blocks assigning a worker to a shift whose date falls in one of their own ranges.';
