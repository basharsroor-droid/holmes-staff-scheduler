-- Let a manager duplicate a whole month's shift structure and staffing
-- pattern from a previous period into a new, empty one in the same
-- branch, instead of rebuilding the same recurring schedule from scratch
-- every month.
--
-- Matching strategy: each source shift is placed at the Nth occurrence of
-- its weekday within the source month (e.g. "the 2nd Wednesday"), and
-- recreated at the Nth occurrence of that SAME weekday in the target
-- month. Months of different lengths mean a weekday's occurrence count
-- doesn't always match (e.g. a source month's 5th Monday has no
-- counterpart in a target month with only 4) -- those source shifts are
-- silently skipped, not an error, since duplicating "most of last month"
-- is still useful. dense_rank(), not row_number(), for the occurrence
-- number: several shifts sharing the same date (opening/middle/closing on
-- one day) must all resolve to the SAME occurrence rank, or the mapping
-- silently corrupts for any day with more than one shift -- caught live
-- while testing this migration (row_number() spread same-date shifts
-- across consecutive ranks; dense_rank() only advances on a genuinely
-- different date).
--
-- Only carries an assignment over if that member is still 'active' in the
-- organization -- ties into release_future_shifts_on_suspension: a
-- suspended employee should not be silently re-scheduled onto next
-- month's duplicate either.
--
-- Target must currently have zero shifts -- duplicate is only for
-- starting a new empty month, never a partial merge into one that already
-- has shifts (avoids ambiguous conflict resolution).
--
-- Tested live against the pilot organization: duplicated the real
-- September 2026 schedule (90 shifts, 2 real assignments) into a
-- temporary empty October period -- got 84 shifts (28 days x 3 templates,
-- every day either fully copied or fully skipped, confirming the
-- dense_rank fix), and both real assignments correctly landed on their
-- shifted weekday-equivalent dates. All test periods/shifts/assignments
-- were removed afterward; the pilot organization was left with exactly
-- its original September schedule.

create or replace function public.duplicate_schedule_period(source_period_id uuid, target_period_id uuid)
returns table(shifts_created integer, assignments_created integer, assignments_skipped_inactive integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  source_period public.schedule_periods%rowtype;
  target_period public.schedule_periods%rowtype;
  existing_target_shifts integer;
  v_shifts_created integer := 0;
  v_assignments_created integer := 0;
  v_assignments_skipped integer := 0;
  rec record;
  target_date date;
  new_shift_id uuid;
  inserted_assignments integer;
  source_assignment_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into source_period from public.schedule_periods where id = source_period_id for update;
  select * into target_period from public.schedule_periods where id = target_period_id for update;

  if source_period.id is null or target_period.id is null then raise exception 'Schedule period not found'; end if;
  if source_period.id = target_period.id then raise exception 'Source and target periods must be different'; end if;
  if source_period.organization_id <> target_period.organization_id
     or source_period.branch_id <> target_period.branch_id then
    raise exception 'Source and target periods must be in the same branch';
  end if;
  if not (select private.has_org_role(
    target_period.organization_id,
    array['owner','admin','manager']::public.member_role[]
  )) then
    raise exception 'Manager permission required';
  end if;

  select count(*) into existing_target_shifts from public.shifts where schedule_period_id = target_period.id;
  if existing_target_shifts > 0 then
    raise exception 'Target period already has shifts; duplicate only works into an empty schedule';
  end if;

  for rec in
    select
      s.id, s.shift_template_id, s.shift_date, s.name, s.start_time, s.end_time, s.required_employees,
      dense_rank() over (partition by extract(dow from s.shift_date) order by s.shift_date) as occurrence,
      extract(dow from s.shift_date)::int as weekday
    from public.shifts s
    where s.schedule_period_id = source_period.id
      and s.status <> 'cancelled'
    order by s.shift_date
  loop
    select gs::date into target_date
    from (
      select gs, row_number() over (order by gs) as occ
      from generate_series(
        make_date(target_period.year, target_period.month, 1),
        (make_date(target_period.year, target_period.month, 1) + interval '1 month - 1 day')::date,
        interval '1 day'
      ) as gs
      where extract(dow from gs)::int = rec.weekday
    ) matching_weekday
    where occ = rec.occurrence;

    if target_date is null then
      continue;
    end if;

    insert into public.shifts (
      organization_id, schedule_period_id, shift_template_id, shift_date, name,
      start_time, end_time, required_employees, status
    ) values (
      target_period.organization_id, target_period.id, rec.shift_template_id, target_date, rec.name,
      rec.start_time, rec.end_time, rec.required_employees, 'draft'
    )
    returning id into new_shift_id;

    v_shifts_created := v_shifts_created + 1;

    select count(*) into source_assignment_count
    from public.shift_assignments a
    where a.shift_id = rec.id;

    insert into public.shift_assignments (organization_id, shift_id, user_id)
    select target_period.organization_id, new_shift_id, a.user_id
    from public.shift_assignments a
    where a.shift_id = rec.id
      and exists (
        select 1 from public.organization_memberships m
        where m.user_id = a.user_id
          and m.organization_id = target_period.organization_id
          and m.status = 'active'
      );
    get diagnostics inserted_assignments = row_count;

    v_assignments_created := v_assignments_created + inserted_assignments;
    v_assignments_skipped := v_assignments_skipped + (source_assignment_count - inserted_assignments);
  end loop;

  return query select v_shifts_created, v_assignments_created, v_assignments_skipped;
end;
$$;

revoke all on function public.duplicate_schedule_period(uuid, uuid) from public, anon;
grant execute on function public.duplicate_schedule_period(uuid, uuid) to authenticated;

comment on function public.duplicate_schedule_period(uuid, uuid)
  is 'Copies shifts and active-member assignments from source_period_id into an empty target_period_id, matched by weekday occurrence. Manager/admin/owner only.';
