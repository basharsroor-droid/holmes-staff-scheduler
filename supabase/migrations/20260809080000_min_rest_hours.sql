-- Let an owner/admin set an optional minimum rest time (hours) the
-- organization wants between two shifts for the same employee, and have
-- the schedule builder warn before scheduling someone back-to-back with
-- too little rest -- until now the only per-worker scheduling guard was
-- hasConflict (overlapping shifts), which says nothing about a worker
-- finishing a closing shift at midnight and opening again at 7am.
--
-- Deliberately a soft cap, not a hard block, matching the exact roadmap
-- wording ("+ התראה על חריגה" -- "+ alert on violation", not "+ block"):
-- a manager should be able to confirm past it (a short turnaround is
-- sometimes genuinely fine/requested) rather than being unable to
-- schedule someone at all. Organization-level, not per-employee --
-- minimum rest is normally a blanket policy, unlike the weekly hours cap
-- which varies per employee's contract.
--
-- Tested live: a valid update (8) succeeds, an invalid one (0) is
-- correctly rejected by the check constraint, then reverted to null.

alter table public.organizations
  add column if not exists min_rest_hours integer
  constraint organizations_min_rest_hours_check check (min_rest_hours is null or min_rest_hours > 0);

comment on column public.organizations.min_rest_hours
  is 'Optional minimum rest time (hours) the org wants between two shifts for the same employee. Informational for the schedule builder -- assigning past it prompts a confirmation, it does not block.';
