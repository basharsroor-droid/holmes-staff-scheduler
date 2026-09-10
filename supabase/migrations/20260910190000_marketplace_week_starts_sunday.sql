-- C1 from docs/REMEDIATION_PLAN.md (the SQL half).
--
-- The Open Shifts marketplace guardrail grouped "this week" with
-- date_trunc('week', ...), which is an ISO week: Monday to Sunday. Every
-- week calculation in the browser (weekStartKey, six copies in
-- app/workspace/schedule-builder) uses getDay(): Sunday to Saturday -- the
-- Israeli working week. So for a Sunday shift the server summed the
-- previous Mon-Sun week while the manager's screen summed the new Sun-Sat
-- week, and the weekly-hours limit could reject (or allow) a request the
-- UI showed the opposite for. Verified: SQL put 2026-09-13 (a Sunday) in
-- the week of 2026-09-07.
--
-- Exposure when fixed: none -- 0 memberships have weekly_hours_limit set
-- and there are 0 open_shift_requests -- but three live organisations have
-- the marketplace enabled, so the first one to set a limit would hit it.
--
-- The fix: a week starts on the Sunday on or before the date,
-- d - extract(dow from d)::int (dow: Sunday = 0). The function below is
-- the live definition (pg_get_functiondef, 2026-09-10) with ONLY that one
-- predicate changed; the staging dry run asserted prosrc differs from the
-- original by exactly that line.
--
-- search_path is left as 'public, private' on purpose: normalising it is
-- A3, a separate change.

create or replace function private.assert_shift_marketplace_eligibility(target_shift_id uuid, target_user_id uuid)
returns void
language plpgsql
set search_path = public, private
as $function$
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
      and (s.shift_date - extract(dow from s.shift_date)::int) = (target_shift.shift_date - extract(dow from target_shift.shift_date)::int)
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
$function$;
