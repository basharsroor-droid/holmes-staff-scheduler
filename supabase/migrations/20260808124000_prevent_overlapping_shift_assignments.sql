-- Prevent assigning an employee to two shifts whose times overlap.
--
-- Until now, shift_assignments only had a UNIQUE(shift_id, user_id)
-- constraint, which stops the same person being double-booked onto the
-- *same* shift, but nothing stopped assigning them to two *different*
-- shifts that overlap in time (e.g. 07:00-15:00 and 14:00-22:00 on the
-- same day). Overnight shifts (end_time <= start_time) are handled by
-- treating them as spanning into the next calendar day.
--
-- Back-to-back shifts (one ending exactly when the next starts) remain
-- allowed -- a common real scheduling pattern -- via an exclusive upper
-- bound on the time range comparison.

create or replace function public.check_shift_assignment_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_start timestamp;
  new_end timestamp;
  conflict_count integer;
begin
  select
    s.shift_date + s.start_time,
    s.shift_date + s.end_time + (case when s.end_time <= s.start_time then interval '1 day' else interval '0' end)
  into new_start, new_end
  from public.shifts s
  where s.id = new.shift_id;

  if new_start is null then
    return new;
  end if;

  select count(*) into conflict_count
  from public.shift_assignments sa
  join public.shifts s on s.id = sa.shift_id
  where sa.user_id = new.user_id
    and sa.id is distinct from new.id
    and s.status <> 'cancelled'
    and tsrange(
      s.shift_date + s.start_time,
      s.shift_date + s.end_time + (case when s.end_time <= s.start_time then interval '1 day' else interval '0' end),
      '[)'
    ) && tsrange(new_start, new_end, '[)');

  if conflict_count > 0 then
    raise exception 'Employee is already assigned to an overlapping shift';
  end if;

  return new;
end;
$$;

revoke all on function public.check_shift_assignment_overlap() from public, anon;

drop trigger if exists shift_assignment_overlap_check on public.shift_assignments;
create trigger shift_assignment_overlap_check
  before insert or update of shift_id, user_id on public.shift_assignments
  for each row execute function public.check_shift_assignment_overlap();
