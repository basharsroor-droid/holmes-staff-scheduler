-- Phase 3: Shift Marketplace
-- Harden employee requests and manager approvals with scheduling eligibility checks.

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
  target_period public.schedule_periods%rowtype;
  actor_membership public.organization_memberships%rowtype;
  assigned_count integer;
  target_hours numeric;
  current_week_hours numeric;
  org_min_rest numeric;
  availability_status text;
  result public.open_shift_requests%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;

  select s.* into target_shift from public.shifts s where s.id = target_shift_id for share;
  if not found or not target_shift.open_for_requests or target_shift.status <> 'published' then
    raise exception 'Shift is not open for requests';
  end if;

  select * into target_period from public.schedule_periods sp
  where sp.id = target_shift.schedule_period_id and sp.organization_id = target_shift.organization_id;

  select * into actor_membership from public.organization_memberships om
  where om.organization_id = target_shift.organization_id
    and om.user_id = actor_id and om.status = 'active' and om.role in ('employee','manager')
  limit 1;
  if not found then raise exception 'Active employee membership required'; end if;

  if not exists (
    select 1 from public.department_memberships dm
    where dm.membership_id = actor_membership.id
      and dm.organization_id = actor_membership.organization_id
      and dm.department_id = target_period.department_id
  ) then raise exception 'Employee is not eligible for this department'; end if;

  if exists (select 1 from public.shift_assignments sa where sa.shift_id = target_shift.id and sa.user_id = actor_id) then
    raise exception 'Employee is already assigned to this shift';
  end if;

  select count(*) into assigned_count from public.shift_assignments sa where sa.shift_id = target_shift.id;
  if assigned_count >= target_shift.required_employees then raise exception 'Shift is already fully staffed'; end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.organization_id = target_shift.organization_id and lr.user_id = actor_id
      and lr.status = 'approved' and target_shift.shift_date between lr.start_date and lr.end_date
  ) then raise exception 'Employee has approved time off'; end if;

  select ae.status::text into availability_status
  from public.availability_submissions avs
  join public.availability_entries ae on ae.submission_id = avs.id
  where avs.schedule_period_id = target_shift.schedule_period_id
    and avs.user_id = actor_id and avs.submitted_at is not null
    and ae.shift_date = target_shift.shift_date
    and ae.shift_template_id = target_shift.shift_template_id
  limit 1;
  if availability_status is null or availability_status = 'unavailable' then
    raise exception 'Employee is not available for this shift';
  end if;

  if exists (
    select 1
    from public.shift_assignments sa
    join public.shifts other on other.id = sa.shift_id
    where sa.user_id = actor_id and other.organization_id = target_shift.organization_id
      and other.id <> target_shift.id and other.status <> 'cancelled'
      and (other.shift_date + other.start_time::time) <
          ((target_shift.shift_date + target_shift.end_time::time) + case when target_shift.end_time::time <= target_shift.start_time::time then interval '1 day' else interval '0' end)
      and (target_shift.shift_date + target_shift.start_time::time) <
          ((other.shift_date + other.end_time::time) + case when other.end_time::time <= other.start_time::time then interval '1 day' else interval '0' end)
  ) then raise exception 'Employee has an overlapping shift'; end if;

  target_hours := extract(epoch from (
    ((target_shift.shift_date + target_shift.end_time::time) + case when target_shift.end_time::time <= target_shift.start_time::time then interval '1 day' else interval '0' end)
    - (target_shift.shift_date + target_shift.start_time::time)
  )) / 3600.0;

  if actor_membership.weekly_hours_limit is not null then
    select coalesce(sum(extract(epoch from (
      ((s.shift_date + s.end_time::time) + case when s.end_time::time <= s.start_time::time then interval '1 day' else interval '0' end)
      - (s.shift_date + s.start_time::time)
    )) / 3600.0), 0)
    into current_week_hours
    from public.shift_assignments sa join public.shifts s on s.id = sa.shift_id
    where sa.user_id = actor_id and s.organization_id = target_shift.organization_id
      and date_trunc('week', s.shift_date::timestamp) = date_trunc('week', target_shift.shift_date::timestamp)
      and s.status <> 'cancelled';
    if current_week_hours + target_hours > actor_membership.weekly_hours_limit then
      raise exception 'Weekly hours limit would be exceeded';
    end if;
  end if;

  select coalesce(o.min_rest_hours, 0) into org_min_rest from public.organizations o where o.id = target_shift.organization_id;
  if org_min_rest > 0 and exists (
    select 1
    from public.shift_assignments sa join public.shifts other on other.id = sa.shift_id
    where sa.user_id = actor_id and other.organization_id = target_shift.organization_id
      and other.id <> target_shift.id and other.status <> 'cancelled'
      and (
        ((target_shift.shift_date + target_shift.start_time::time) >= ((other.shift_date + other.end_time::time) + case when other.end_time::time <= other.start_time::time then interval '1 day' else interval '0' end)
          and (target_shift.shift_date + target_shift.start_time::time) - ((other.shift_date + other.end_time::time) + case when other.end_time::time <= other.start_time::time then interval '1 day' else interval '0' end) < make_interval(hours => org_min_rest::int))
        or
        ((other.shift_date + other.start_time::time) >= ((target_shift.shift_date + target_shift.end_time::time) + case when target_shift.end_time::time <= target_shift.start_time::time then interval '1 day' else interval '0' end)
          and (other.shift_date + other.start_time::time) - ((target_shift.shift_date + target_shift.end_time::time) + case when target_shift.end_time::time <= target_shift.start_time::time then interval '1 day' else interval '0' end) < make_interval(hours => org_min_rest::int))
      )
  ) then raise exception 'Minimum rest requirement would be violated'; end if;

  insert into public.open_shift_requests (organization_id, shift_id, user_id, status, employee_note)
  values (target_shift.organization_id, target_shift.id, actor_id, 'pending', nullif(trim(request_note), ''))
  on conflict (shift_id, user_id) do update
    set status = 'pending', employee_note = excluded.employee_note, manager_note = null,
        decided_by = null, decided_at = null, cancelled_at = null, updated_at = now()
  returning * into result;
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
  actor_membership public.organization_memberships%rowtype;
  employee_membership public.organization_memberships%rowtype;
  target_department_id uuid;
  assigned_count integer;
  result public.open_shift_requests%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;

  select * into req from public.open_shift_requests where id = target_request_id for update;
  if not found or req.status <> 'pending' then raise exception 'Pending request not found'; end if;
  select s.* into target_shift from public.shifts s where s.id = req.shift_id for update;
  if not found then raise exception 'Shift not found'; end if;
  select sp.department_id into target_department_id from public.schedule_periods sp
  where sp.id = target_shift.schedule_period_id and sp.organization_id = target_shift.organization_id;

  select * into actor_membership from public.organization_memberships om
  where om.organization_id = req.organization_id and om.user_id = actor_id and om.status = 'active' limit 1;
  if not found or actor_membership.role not in ('owner','admin','manager') then raise exception 'Manager access required'; end if;
  if actor_membership.role = 'manager' and not exists (
    select 1 from public.department_memberships dm where dm.membership_id = actor_membership.id
      and dm.organization_id = actor_membership.organization_id and dm.department_id = target_department_id
  ) then raise exception 'Department access required'; end if;

  if decision = 'approved' then
    if target_shift.status <> 'published' or not target_shift.open_for_requests then raise exception 'Shift is no longer open'; end if;
    select count(*) into assigned_count from public.shift_assignments sa where sa.shift_id = target_shift.id;
    if assigned_count >= target_shift.required_employees then raise exception 'Shift is already fully staffed'; end if;

    -- Re-run the employee-side eligibility checks immediately before assignment.
    perform public.request_open_shift(target_shift.id, req.employee_note);
    select * into req from public.open_shift_requests where id = target_request_id for update;

    insert into public.shift_assignments (organization_id, shift_id, user_id, assigned_by)
    values (req.organization_id, req.shift_id, req.user_id, actor_id);
  end if;

  update public.open_shift_requests
  set status = decision, manager_note = nullif(trim(decision_note), ''), decided_by = actor_id,
      decided_at = now(), updated_at = now()
  where id = req.id returning * into result;

  if decision = 'approved' then
    select count(*) into assigned_count from public.shift_assignments sa where sa.shift_id = target_shift.id;
    if assigned_count >= target_shift.required_employees then
      update public.shifts set open_for_requests = false, opened_at = null, opened_by = null, updated_at = now() where id = target_shift.id;
      update public.open_shift_requests
      set status = 'rejected', manager_note = coalesce(manager_note, 'המשמרת אוישה.'), decided_by = actor_id, decided_at = now(), updated_at = now()
      where shift_id = target_shift.id and id <> req.id and status = 'pending';
    end if;
  end if;

  insert into public.notifications (organization_id, user_id, channel, template_key, payload, scheduled_for)
  values (req.organization_id, req.user_id, 'in_app',
    case when decision = 'approved' then 'open_shift_request_approved' else 'open_shift_request_rejected' end,
    jsonb_build_object('shift_id', req.shift_id, 'request_id', req.id), now());
  return result;
end;
$$;

revoke all on function public.request_open_shift(uuid, text) from public, anon;
revoke all on function public.decide_open_shift_request(uuid, public.open_shift_request_status, text) from public, anon;
grant execute on function public.request_open_shift(uuid, text) to authenticated;
grant execute on function public.decide_open_shift_request(uuid, public.open_shift_request_status, text) to authenticated;
