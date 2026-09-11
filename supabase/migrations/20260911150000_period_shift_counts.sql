-- B3 (docs/REMEDIATION_PLAN.md): the schedule builder needs only the NUMBER of
-- shifts in each work month -- to offer "duplicate from a previous month" and to
-- show which months can seed a template -- but it downloaded every shift the
-- business ever had just to count them. This returns the counts directly.
--
-- SECURITY INVOKER: RLS on public.shifts decides what the caller sees, exactly
-- as the old client-side count over RLS-filtered rows did.

create or replace function public.period_shift_counts()
returns table (schedule_period_id uuid, shift_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select shift.schedule_period_id, count(*)::bigint
  from public.shifts shift
  where shift.status <> 'cancelled'
  group by shift.schedule_period_id;
$$;

revoke all on function public.period_shift_counts() from public, anon;
grant execute on function public.period_shift_counts() to authenticated;

comment on function public.period_shift_counts() is
  'Non-cancelled shift count per work month, scoped by RLS. Used by the schedule builder instead of loading every shift (B3).';
