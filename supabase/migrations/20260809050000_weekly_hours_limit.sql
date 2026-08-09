-- Let a manager set an optional per-employee weekly hour cap, so the
-- schedule builder can warn before over-scheduling someone (e.g. a
-- part-timer contracted for 20h/week) instead of the only limits being
-- "no double-booking" and "not on a day marked unavailable/leave".
--
-- Deliberately a soft cap, not a hard block: legitimate overtime happens,
-- and a manager should be able to override with a confirmation rather
-- than being unable to schedule someone at all. Week boundary is
-- Sunday-Saturday, matching the Israeli work week this product targets.
--
-- Tested live: a valid update (40) succeeds, an invalid one (0) is
-- correctly rejected by the check constraint, then reverted to null.

alter table public.organization_memberships
  add column if not exists weekly_hours_limit integer
  constraint organization_memberships_weekly_hours_limit_check check (weekly_hours_limit is null or weekly_hours_limit > 0);

comment on column public.organization_memberships.weekly_hours_limit
  is 'Optional per-employee weekly hour cap (Sunday-Saturday). Informational for the schedule builder -- assigning past it prompts a confirmation, it does not block.';
