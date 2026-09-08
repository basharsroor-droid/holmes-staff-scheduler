-- Launch pricing v2 -- re-price after the 2026-09 competitive benchmark
-- (docs/PRICING_BENCHMARK.md) and add the "network" tier that bridges the gap
-- between single-branch Business Pro and custom Enterprise. Keeps public.plans
-- in sync with lib/plans.ts.
--
-- Re-pricing vs the first draft (20260903120000_subscription_foundation.sql):
--   solo          59 -> 69   / 590  -> 690    (quotas unchanged)
--   business     129 -> 179  / 1290 -> 1790   (max_managers 4 -> 5)
--   business_pro 259 -> 339  / 2590 -> 3390   (max_departments 8 -> 10, max_managers 12 -> 15)
--
-- New tier:
--   network      549 / 5490, 150 employees / 20 departments / 25 managers / 3 branches
--
-- Enterprise stays custom; its public "from" anchor moves 499 -> 899 (copy only,
-- lib/plans.ts -- no numeric column here) and it now means 4+ branches.
--
-- Prices are launch prices, ILS, pre-VAT. No existing subscription row changes
-- plan_id; this only updates the catalogue the pricing page and billing screen
-- read.

-- 1. Allow the new plan id.
alter table public.plans
  drop constraint if exists plans_id_check;
alter table public.plans
  add constraint plans_id_check
  check (id in ('solo', 'business', 'business_pro', 'network', 'enterprise'));

-- 2. Re-price existing plans.
update public.plans set
  monthly_price_ils = 69,
  annual_price_ils  = 690
where id = 'solo';

update public.plans set
  monthly_price_ils = 179,
  annual_price_ils  = 1790,
  max_managers      = 5
where id = 'business';

update public.plans set
  monthly_price_ils = 339,
  annual_price_ils  = 3390,
  max_departments   = 10,
  max_managers      = 15
where id = 'business_pro';

-- 3. Insert the network tier just below enterprise, and renumber enterprise.
update public.plans set sort = 5 where id = 'enterprise';

insert into public.plans
  (id, name, sort, monthly_price_ils, annual_price_ils, max_active_employees, max_departments, max_managers, max_branches, is_public)
values
  ('network', 'רשת', 4, 549, 5490, 150, 20, 25, 3, true)
on conflict (id) do update set
  name                 = excluded.name,
  sort                 = excluded.sort,
  monthly_price_ils    = excluded.monthly_price_ils,
  annual_price_ils     = excluded.annual_price_ils,
  max_active_employees = excluded.max_active_employees,
  max_departments      = excluded.max_departments,
  max_managers         = excluded.max_managers,
  max_branches         = excluded.max_branches,
  is_public            = excluded.is_public;
