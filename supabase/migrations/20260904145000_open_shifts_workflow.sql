-- Phase 1: Open Shifts
-- Managers expose an unfilled published shift to eligible employees.
-- Employees request it; only manager approval creates an assignment.

create type public.open_shift_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

alter table public.shifts
  add column open_for_requests boolean not null default false,
  add column opened_at timestamptz,
  add column opened_by uuid references auth.users(id);

create index shifts_open_for_requests_idx
  on public.shifts (organization_id, shift_date)
  where open_for_requests = true;
create index shifts_opened_by_idx
  on public.shifts (opened_by)
  where opened_by is not null;

create table public.open_shift_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.open_shift_request_status not null default 'pending',
  employee_note text,
  manager_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, user_id)
);

create index open_shift_requests_org_status_idx
  on public.open_shift_requests (organization_id, status, created_at desc);
create index open_shift_requests_shift_status_idx
  on public.open_shift_requests (shift_id, status);
create index open_shift_requests_user_status_idx
  on public.open_shift_requests (user_id, status, created_at desc);
create index open_shift_requests_decided_by_idx
  on public.open_shift_requests (decided_by)
  where decided_by is not null;

alter table public.open_shift_requests enable row level security;

create policy "open shift requests scoped select"
on public.open_shift_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organization_memberships om
    join public.schedule_periods sp on sp.organization_id = om.organization_id
    join public.shifts s on s.schedule_period_id = sp.id and s.organization_id = sp.organization_id
    where om.user_id = auth.uid()
      and om.status = 'active'
      and om.organization_id = open_shift_requests.organization_id
      and s.id = open_shift_requests.shift_id
      and (
        om.role in ('owner', 'admin')
        or (
          om.role = 'manager'
          and exists (
            select 1
            from public.department_memberships dm
            where dm.membership_id = om.id
              and dm.organization_id = om.organization_id
              and dm.department_id = sp.department_id
          )
        )
      )
  )
);

create policy "employees request open shifts"
on public.open_shift_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and decided_by is null
  and decided_at is null
  and cancelled_at is null
  and exists (
    select 1
    from public.shifts s
    join public.schedule_periods sp
      on sp.id = s.schedule_period_id and sp.organization_id = s.organization_id
    join public.organization_memberships om
      on om.organization_id = s.organization_id and om.user_id = auth.uid()
    where s.id = open_shift_requests.shift_id
      and s.organization_id = open_shift_requests.organization_id
      and s.open_for_requests = true
      and s.status = 'published'
      and om.status = 'active'
      and om.role in ('employee', 'manager')
      and exists (
        select 1
        from public.department_memberships dm
        where dm.membership_id = om.id
          and dm.organization_id = om.organization_id
          and dm.department_id = sp.department_id
      )
  )
);

-- No direct UPDATE/DELETE policies. State transitions use guarded RPCs.

create or replace function public.set_shift_open_for_requests(
  target_shift_id uuid,
  make_open boolean
)
returns public.shifts
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  target_shift public.shifts%rowtype;
  actor_membership public.organization_memberships%rowtype;
  target_department_id uuid;
  assigned_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select s.* into target_shift
  from public.shifts s
  where s.id = target_shift_id
  for update;

  if not found then
    raise exception 'Shift not found';
  end if;

  select sp.department_id into target_department_id
  from public.schedule_periods sp
  where sp.id = target_shift.schedule_period_id
    and sp.organization_id = target_shift.organization_id;

  select * into actor_membership
  from public.organization_memberships om
  where om.organization_id = target_shift.organization_id
    and om.user_id = actor_id
    and om.status = 'active'
  limit 1;

  if not found or actor_membership.role not in ('owner', 'admin', 'manager') then
    raise exception 'Manager access required';
  end if;

  if actor_membership.role = 'manager' and not exists (
    select 1
    from public.department_memberships dm
    where dm.membership_id = actor_membership.id
      and dm.organization_id = actor_membership.organization_id
      and dm.department_id = target_department_id
  ) then
    raise exception 'Department access required';
  end if;

  if make_open then
    if target_shift.status <> 'published' then
      raise exception 'Only published shifts can be opened';
    end if;

    select count(*) into assigned_count
    from public.shift_assignments sa
    where sa.shift_id = target_shift.id;

    if assigned_count >= target_shift.required_employees then
      raise exception 'Shift is already fully staffed';
    end if;
  end if;

  update public.shifts
  set open_for_requests = make_open,
      opened_at = case when make_open then now() else null end,
      opened_by = case when make_open then actor_id else null end,
      updated_at = now()
  where id = target_shift.id
  returning * into target_shift;

  if not make_open then
    update public.open_shift_requests
    set status = 'rejected',
        manager_note = coalesce(manager_note, 'המשמרת נסגרה לבקשות.'),
        decided_by = actor_id,
        decided_at = now(),
        updated_at = now()
    where shift_id = target_shift.id
      and status = 'pending';
  end if;

  return target_shift;
end;
$$;

create or replace function public.request_open_shift(
  target_shift_id uuid,
  request_note text default null
)
returns public.open_shift_requests
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  target_shift public.shifts%rowtype;
  target_department_id uuid;
  actor_membership public.organization_memberships%rowtype;
  assigned_count integer;
  result public.open_shift_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select s.* into target_shift
  from public.shifts s
  where s.id = target_shift_id
  for share;

  if not found or not target_shift.open_for_requests or target_shift.status <> 'published' then
    raise exception 'Shift is not open for requests';
  end if;

  select sp.department_id into target_department_id
  from public.schedule_periods sp
  where sp.id = target_shift.schedule_period_id
    and sp.organization_id = target_shift.organization_id;

  select * into actor_membership
  from public.organization_memberships om
  where om.organization_id = target_shift.organization_id
    and om.user_id = actor_id
    and om.status = 'active'
    and om.role in ('employee', 'manager')
  limit 1;

  if not found then
    raise exception 'Active employee membership required';
  end if;

  if not exists (
    select 1
    from public.department_memberships dm
    where dm.membership_id = actor_membership.id
      and dm.organization_id = actor_membership.organization_id
      and dm.department_id = target_department_id
  ) then
    raise exception 'Employee is not eligible for this department';
  end if;

  if exists (
    select 1
    from public.shift_assignments sa
    where sa.shift_id = target_shift.id
      and sa.user_id = actor_id
  ) then
    raise exception 'Employee is already assigned to this shift';
  end if;

  select count(*) into assigned_count
  from public.shift_assignments sa
  where sa.shift_id = target_shift.id;

  if assigned_count >= target_shift.required_employees then
    raise exception 'Shift is already fully staffed';
  end if;

  insert into public.open_shift_requests (
    organization_id, shift_id, user_id, status, employee_note
  ) values (
    target_shift.organization_id,
    target_shift.id,
    actor_id,
    'pending',
    nullif(trim(request_note), '')
  )
  on conflict (shift_id, user_id) do update
    set status = 'pending',
        employee_note = excluded.employee_note,
        manager_note = null,
        decided_by = null,
        decided_at = null,
        cancelled_at = null,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.cancel_open_shift_request(
  target_request_id uuid
)
returns public.open_shift_requests
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  result public.open_shift_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  update public.open_shift_requests
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where id = target_request_id
    and user_id = actor_id
    and status = 'pending'
  returning * into result;

  if not found then
    raise exception 'Pending request not found';
  end if;

  return result;
end;
$$;

create or replace function public.decide_open_shift_request(
  target_request_id uuid,
  decision public.open_shift_request_status,
  decision_note text default null
)
returns public.open_shift_requests
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  req public.open_shift_requests%rowtype;
  target_shift public.shifts%rowtype;
  target_department_id uuid;
  actor_membership public.organization_memberships%rowtype;
  assigned_count integer;
  result public.open_shift_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into req
  from public.open_shift_requests
  where id = target_request_id
  for update;

  if not found or req.status <> 'pending' then
    raise exception 'Pending request not found';
  end if;

  select s.* into target_shift
  from public.shifts s
  where s.id = req.shift_id
  for update;

  if not found then
    raise exception 'Shift not found';
  end if;

  select sp.department_id into target_department_id
  from public.schedule_periods sp
  where sp.id = target_shift.schedule_period_id
    and sp.organization_id = target_shift.organization_id;

  select * into actor_membership
  from public.organization_memberships om
  where om.organization_id = req.organization_id
    and om.user_id = actor_id
    and om.status = 'active'
  limit 1;

  if not found or actor_membership.role not in ('owner', 'admin', 'manager') then
    raise exception 'Manager access required';
  end if;

  if actor_membership.role = 'manager' and not exists (
    select 1
    from public.department_memberships dm
    where dm.membership_id = actor_membership.id
      and dm.organization_id = actor_membership.organization_id
      and dm.department_id = target_department_id
  ) then
    raise exception 'Department access required';
  end if;

  if decision = 'approved' then
    if target_shift.status <> 'published' or not target_shift.open_for_requests then
      raise exception 'Shift is no longer open';
    end if;

    select count(*) into assigned_count
    from public.shift_assignments sa
    where sa.shift_id = target_shift.id;

    if assigned_count >= target_shift.required_employees then
      raise exception 'Shift is already fully staffed';
    end if;

    insert into public.shift_assignments (
      organization_id, shift_id, user_id, assigned_by
    ) values (
      req.organization_id, req.shift_id, req.user_id, actor_id
    );
  end if;

  update public.open_shift_requests
  set status = decision,
      manager_note = nullif(trim(decision_note), ''),
      decided_by = actor_id,
      decided_at = now(),
      updated_at = now()
  where id = req.id
  returning * into result;

  if decision = 'approved' then
    select count(*) into assigned_count
    from public.shift_assignments sa
    where sa.shift_id = target_shift.id;

    if assigned_count >= target_shift.required_employees then
      update public.shifts
      set open_for_requests = false,
          opened_at = null,
          opened_by = null,
          updated_at = now()
      where id = target_shift.id;

      update public.open_shift_requests
      set status = 'rejected',
          manager_note = coalesce(manager_note, 'המשמרת אוישה.'),
          decided_by = actor_id,
          decided_at = now(),
          updated_at = now()
      where shift_id = target_shift.id
        and id <> req.id
        and status = 'pending';
    end if;
  end if;

  insert into public.notifications (
    organization_id, user_id, channel, template_key, payload, scheduled_for
  ) values (
    req.organization_id,
    req.user_id,
    'in_app',
    case
      when decision = 'approved' then 'open_shift_request_approved'
      else 'open_shift_request_rejected'
    end,
    jsonb_build_object('shift_id', req.shift_id, 'request_id', req.id),
    now()
  );

  return result;
end;
$$;

revoke all on function public.set_shift_open_for_requests(uuid, boolean) from public, anon;
revoke all on function public.request_open_shift(uuid, text) from public, anon;
revoke all on function public.cancel_open_shift_request(uuid) from public, anon;
revoke all on function public.decide_open_shift_request(uuid, public.open_shift_request_status, text) from public, anon;

grant execute on function public.set_shift_open_for_requests(uuid, boolean) to authenticated;
grant execute on function public.request_open_shift(uuid, text) to authenticated;
grant execute on function public.cancel_open_shift_request(uuid) to authenticated;
grant execute on function public.decide_open_shift_request(uuid, public.open_shift_request_status, text) to authenticated;

grant select on public.open_shift_requests to authenticated;
