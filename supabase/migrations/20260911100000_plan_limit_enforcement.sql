-- J3 from docs/REMEDIATION_PLAN.md (Wave 4): enforce plan limits.
--
-- plans carries max_active_employees / max_managers / max_branches /
-- max_departments, and the organization_usage view has always computed usage
-- against them -- but nothing enforced them: a Solo workspace (10 employees,
-- 1 manager) could invite 500 people. This adds the enforcement, in the
-- database, because rows reach these tables by several paths: the invitation
-- RPCs, direct RLS writes from the browser (departments are inserted and
-- re-activated from app/workspace/departments; members' role/status are
-- updated from app/workspace/employees), and onboarding.
--
-- Rules:
--   * Only NEW capacity is checked: a row being inserted as active, or a row
--     that starts counting (re-activated, or moved into the employee/manager
--     class). Existing rows are never blocked or removed, so a workspace that is
--     already over its limit (e.g. after moving to a smaller plan) keeps
--     working; it just can't grow until it upgrades.
--   * Counting follows organization_usage: "managers" are owner + admin +
--     manager, "employees" are role employee, both status = 'active'.
--   * Owner is never limited: moving INTO owner, and the previous owner
--     becoming admin (transfer_organization_ownership), keep working on every
--     plan. There is always exactly one owner.
--   * No subscription yet = nothing to enforce. create_organization_workspace
--     inserts the first branch and the owner before the subscription row, so
--     onboarding passes on every plan. A NULL limit (enterprise) = unlimited.
--   * Invitations count active members PLUS pending invitations, so the owner
--     hears "limit reached" when inviting. Memberships count active members
--     ONLY: accept_organization_invitation inserts the membership before it
--     marks the invitation accepted, so counting pending there would count the
--     invitee twice and wrongly block the last free seat.
--   * The subscription row is locked (FOR UPDATE) during the check, so two
--     concurrent additions can't both slip under the limit.
--
-- The functions are SECURITY DEFINER with search_path = '' (the project rule
-- the schema-invariants gate checks). They must be definer: as the invoker, a
-- department manager only sees their own department's members and would
-- undercount.
--
-- Errors: message 'plan_limit:<employee|manager|branch|department>', detail
-- with the limit and current usage. lib/plan-limit-errors.ts maps them to
-- Hebrew in the UI.

create or replace function private.assert_plan_capacity(
  target_organization_id uuid,
  resource text,
  include_pending_invitations boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_row public.plans%rowtype;
  limit_value integer;
  in_use bigint := 0;
  pending bigint := 0;
begin
  select p.* into plan_row
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = target_organization_id
  for update of s;

  if plan_row.id is null then
    return;
  end if;

  limit_value := case resource
    when 'employee' then plan_row.max_active_employees
    when 'manager' then plan_row.max_managers
    when 'branch' then plan_row.max_branches
    when 'department' then plan_row.max_departments
  end;

  if resource not in ('employee', 'manager', 'branch', 'department') then
    raise exception 'Unknown plan resource %', resource;
  end if;
  if limit_value is null then
    return;
  end if;

  if resource = 'employee' then
    select count(*) into in_use
    from public.organization_memberships m
    where m.organization_id = target_organization_id and m.status = 'active' and m.role = 'employee';
    if include_pending_invitations then
      select count(*) into pending
      from public.organization_invitations i
      where i.organization_id = target_organization_id and i.status = 'pending' and i.role = 'employee';
    end if;
  elsif resource = 'manager' then
    select count(*) into in_use
    from public.organization_memberships m
    where m.organization_id = target_organization_id and m.status = 'active'
      and m.role in ('owner', 'admin', 'manager');
    if include_pending_invitations then
      select count(*) into pending
      from public.organization_invitations i
      where i.organization_id = target_organization_id and i.status = 'pending'
        and i.role in ('admin', 'manager');
    end if;
  elsif resource = 'branch' then
    select count(*) into in_use
    from public.branches b
    where b.organization_id = target_organization_id and b.active;
  else
    select count(*) into in_use
    from public.departments d
    where d.organization_id = target_organization_id and d.active;
  end if;

  if in_use + pending >= limit_value then
    raise exception using
      message = format('plan_limit:%s', resource),
      detail = format('Plan %s allows %s; %s already in use.', plan_row.id, limit_value, in_use + pending),
      hint = 'Upgrade the plan to add more.';
  end if;
end;
$$;

-- Which limited class a member occupies: 'employee', 'manager', or null
-- (not active, or owner -- never limited).
create or replace function private.plan_limit_member_class(member_role public.member_role, member_status public.member_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when member_status <> 'active' then null
    when member_role = 'employee' then 'employee'
    when member_role in ('admin', 'manager') then 'manager'
    else null
  end;
$$;

create or replace function private.enforce_membership_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_class text := private.plan_limit_member_class(new.role, new.status);
begin
  if new_class is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    -- Same seat as before, or the previous owner stepping down to admin during
    -- an ownership transfer: no new capacity is being taken.
    if old.role = 'owner'
       or private.plan_limit_member_class(old.role, old.status) is not distinct from new_class then
      return new;
    end if;
  end if;
  perform private.assert_plan_capacity(new.organization_id, new_class, false);
  return new;
end;
$$;

create or replace function private.enforce_structure_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active and (tg_op = 'INSERT' or not old.active) then
    perform private.assert_plan_capacity(
      new.organization_id,
      case tg_table_name when 'branches' then 'branch' else 'department' end,
      false
    );
  end if;
  return new;
end;
$$;

create or replace function private.enforce_invitation_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_class text;
begin
  if new.status <> 'pending' then
    return new;
  end if;
  new_class := case
    when new.role = 'employee' then 'employee'
    when new.role in ('admin', 'manager') then 'manager'
    else null
  end;
  if new_class is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'pending' and (
    case when old.role = 'employee' then 'employee' when old.role in ('admin', 'manager') then 'manager' end
  ) is not distinct from new_class then
    return new; -- a re-sent invitation keeps the seat it already reserved
  end if;
  perform private.assert_plan_capacity(new.organization_id, new_class, true);
  return new;
end;
$$;

revoke all on function private.assert_plan_capacity(uuid, text, boolean) from public;
revoke all on function private.plan_limit_member_class(public.member_role, public.member_status) from public;
revoke all on function private.enforce_membership_plan_limit() from public;
revoke all on function private.enforce_structure_plan_limit() from public;
revoke all on function private.enforce_invitation_plan_limit() from public;

drop trigger if exists organization_memberships_plan_limit on public.organization_memberships;
create trigger organization_memberships_plan_limit
  before insert or update of role, status on public.organization_memberships
  for each row execute function private.enforce_membership_plan_limit();

drop trigger if exists branches_plan_limit on public.branches;
create trigger branches_plan_limit
  before insert or update of active on public.branches
  for each row execute function private.enforce_structure_plan_limit();

drop trigger if exists departments_plan_limit on public.departments;
create trigger departments_plan_limit
  before insert or update of active on public.departments
  for each row execute function private.enforce_structure_plan_limit();

drop trigger if exists organization_invitations_plan_limit on public.organization_invitations;
create trigger organization_invitations_plan_limit
  before insert or update of role, status on public.organization_invitations
  for each row execute function private.enforce_invitation_plan_limit();
