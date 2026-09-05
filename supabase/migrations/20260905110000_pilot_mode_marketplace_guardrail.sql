-- Pilot Mode must fail-closed server-side, not just hide UI. Hiding the
-- Shift Marketplace panels in the client is not enough on its own: an
-- employee or manager who already knows (or guesses) the RPC name could
-- still call public.request_open_shift / public.set_shift_open_for_requests
-- directly against Supabase and bypass the intended pilot restriction.
--
-- This migration adds a pilot_mode check to the two entry points that can
-- actually expose a pilot organization's shifts to the marketplace:
--   - private.assert_shift_marketplace_eligibility, the single choke point
--     used by both public.request_open_shift (employee request) and the
--     approval branch of public.decide_open_shift_request (manager
--     approval) -- blocking it here closes both paths at once.
--   - public.set_shift_open_for_requests, but only when make_open = true
--     (closing an already-open shift stays allowed; it can only reduce
--     exposure, never create it).
--
-- Everything else is intentionally left alone:
--   - Smart Draft / Fix My Schedule / Smart Replacement write through the
--     same public.shift_assignments insert/delete a manager's manual
--     drag-and-drop assignment uses in the core loop. There is no separate
--     server-side action to lock down without also blocking normal manual
--     scheduling, which pilot organizations must keep.
--   - public.cancel_open_shift_request and the reject branch of
--     public.decide_open_shift_request only ever tear down a pending
--     request, so they stay available -- allowing them can only reduce
--     marketplace exposure for a pilot organization, never create it.
--   - public.check_open_shift_eligibility is read-only and calls the same
--     guarded assert function, so it will correctly report ineligible for
--     a pilot organization without any change here.

create or replace function private.assert_shift_marketplace_eligibility(
  target_shift_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  target_shift public.shifts%rowtype;
  target_period public.schedule_periods%rowtype;
  employee_membership public.organization_memberships%rowtype;
  assigned_count integer;
  target_hours numeric;
  current_week_hours numeric;
  org_min_rest numeric;
  availability_status text;
  org_pilot_mode boolean;
begin
  select s.* into target_shift from public.shifts s where s.id = target_shift_id;
  if not found or not target_shift.open_for_requests or target_shift.status <> 'published' then
    raise exception 'Shift is not open for requests';
  end if;

  select coalesce(o.pilot_mode, false) into org_pilot_mode from public.organizations o where o.id = target_shift.organization_id;
  if org_pilot_mode then
    raise exception 'Shift marketplace is disabled during pilot mode';
  end if;

  select * into target_period from public.schedule_periods sp
  where sp.id = target_shift.schedule_period_id and sp.organization_id = target_shift.organization_id;

  select * into employee_membership from public.organization_memberships om
  where om.organization_id = target_shift.organization_id
    and om.user_id = target_user_id and om.status = 'active' and om.role in ('employee','manager')
  limit 1;
  if not found then raise exception 'Active employee membership required'; end if;

  if not exists (
    select 1 from public.department_memberships dm
    where dm.membership_id = employee_membership.id
      and dm.organization_id = employee_membership.organization_id
      and dm.department_id = target_period.department_id
  ) then raise exception 'Employee is not eligible for this department'; end if;

  if exists (select 1 from public.shift_assignments sa where sa.shift_id = target_shift.id and sa.user_id = target_user_id) then
    raise exception 'Employee is already assigned to this shift';
  end if;

  select count(*) into assigned_count from public.shift_assignments sa where sa.shift_id = target_shift.id;
  if assigned_count >= target_shift.required_employees then raise exception 'Shift is already fully staffed'; end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.organization_id = target_shift.organization_id and lr.user_id = target_user_id
      and lr.status = 'approved' and target_shift.shift_date between lr.start_date and lr.end_date
  ) then raise exception 'Employee has approved time off'; end if;

  select ae.status::text into availability_status
  from public.availability_submissions avs
  join public.availability_entries ae on ae.submission_id = avs.id
  where avs.schedule_period_id = target_shift.schedule_period_id
    and avs.user_id = target_user_id and avs.submitted_at is not null
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
    where sa.user_id = target_user_id and other.organization_id = target_shift.organization_id
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

  if employee_membership.weekly_hours_limit is not null then
    select coalesce(sum(extract(epoch from (
      ((s.shift_date + s.end_time::time) + case when s.end_time::time <= s.start_time::time then interval '1 day' else interval '0' end)
      - (s.shift_date + s.start_time::time)
    )) / 3600.0), 0)
    into current_week_hours
    from public.shift_assignments sa join public.shifts s on s.id = sa.shift_id
    where sa.user_id = target_user_id and s.organization_id = target_shift.organization_id
      and date_trunc('week', s.shift_date::timestamp) = date_trunc('week', target_shift.shift_date::timestamp)
      and s.status <> 'cancelled';
    if current_week_hours + target_hours > employee_membership.weekly_hours_limit then
      raise exception 'Weekly hours limit would be exceeded';
    end if;
  end if;

  select coalesce(o.min_rest_hours, 0) into org_min_rest from public.organizations o where o.id = target_shift.organization_id;
  if org_min_rest > 0 and exists (
    select 1
    from public.shift_assignments sa join public.shifts other on other.id = sa.shift_id
    where sa.user_id = target_user_id and other.organization_id = target_shift.organization_id
      and other.id <> target_shift.id and other.status <> 'cancelled'
      and (
        ((target_shift.shift_date + target_shift.start_time::time) >= ((other.shift_date + other.end_time::time) + case when other.end_time::time <= other.start_time::time then interval '1 day' else interval '0' end)
          and (target_shift.shift_date + target_shift.start_time::time) - ((other.shift_date + other.end_time::time) + case when other.end_time::time <= other.start_time::time then interval '1 day' else interval '0' end) < make_interval(hours => org_min_rest::int))
        or
        ((other.shift_date + other.start_time::time) >= ((target_shift.shift_date + target_shift.end_time::time) + case when target_shift.end_time::time <= target_shift.start_time::time then interval '1 day' else interval '0' end)
          and (other.shift_date + other.start_time::time) - ((target_shift.shift_date + target_shift.end_time::time) + case when target_shift.end_time::time <= target_shift.start_time::time then interval '1 day' else interval '0' end) < make_interval(hours => org_min_rest::int))
      )
  ) then raise exception 'Minimum rest requirement would be violated'; end if;
end;
$$;

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
  org_pilot_mode boolean;
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

  if make_open then
    select coalesce(o.pilot_mode, false) into org_pilot_mode from public.organizations o where o.id = target_shift.organization_id;
    if org_pilot_mode then
      raise exception 'Shift marketplace is disabled during pilot mode';
    end if;
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
