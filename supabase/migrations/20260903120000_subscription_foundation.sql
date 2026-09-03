-- Commercial foundation: plans, per-organization subscription/trial state, and
-- a read-only usage-vs-quota view. No billing provider and no quota enforcement
-- yet -- this slice only models the data and seeds a 30-day trial for every
-- organization (see lib/plans.ts for the matching plan definitions; keep the
-- seeded numbers below in sync with that file).

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'grace_period',
  'read_only',
  'canceled',
  'suspended'
);

-- Public catalogue of plans. Readable by everyone (it backs the pricing page's
-- server checks and the billing screen); only migrations / service role write.
create table public.plans (
  id text primary key check (id in ('solo', 'business', 'business_pro', 'enterprise')),
  name text not null check (char_length(name) between 2 and 60),
  sort integer not null,
  monthly_price_ils integer check (monthly_price_ils is null or monthly_price_ils >= 0),
  annual_price_ils integer check (annual_price_ils is null or annual_price_ils >= 0),
  max_active_employees integer check (max_active_employees is null or max_active_employees > 0),
  max_departments integer check (max_departments is null or max_departments > 0),
  max_managers integer check (max_managers is null or max_managers > 0),
  max_branches integer not null default 1 check (max_branches > 0),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy plans_public_read on public.plans
for select to anon, authenticated
using (true);

grant select on public.plans to anon, authenticated;
revoke insert, update, delete on public.plans from anon, authenticated;

insert into public.plans
  (id, name, sort, monthly_price_ils, annual_price_ils, max_active_employees, max_departments, max_managers, max_branches, is_public)
values
  ('solo',         'מנהל עצמאי',      1,   59,   590,  10,  1,  1,  1, true),
  ('business',     'עסק',             2,  129,  1290,  30,  3,  4,  1, true),
  ('business_pro', 'Business Pro',    3,  259,  2590,  80,  8, 12,  1, true),
  ('enterprise',   'רשת / Enterprise', 4, null,  null, null, null, null, 999, true);

-- One row per organization. Created by create_organization_workspace for new
-- orgs; backfilled below for existing ones.
create table public.subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status public.subscription_status not null default 'trialing',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  billing_period text not null default 'trial' check (billing_period in ('trial', 'monthly', 'annual')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_trial_ends_idx on public.subscriptions (trial_ends_at)
  where status = 'trialing';

alter table public.subscriptions enable row level security;

-- Active members of the organization may read their subscription. All writes go
-- through SECURITY DEFINER RPCs (which run as the function owner) or the service
-- role -- never directly from the client.
create policy subscriptions_select_members on public.subscriptions
for select to authenticated
using ((select private.is_org_member(organization_id)));

grant select on public.subscriptions to authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Backfill: every existing organization gets a subscription row. Real tenants
-- start a fresh 30-day trial; the shared demo/sales tenant is marked active so
-- it never shows trial-expiry messaging.
insert into public.subscriptions
  (organization_id, plan_id, status, trial_started_at, trial_ends_at, billing_period)
select
  o.id,
  'business',
  case when o.is_demo then 'active'::public.subscription_status else 'trialing'::public.subscription_status end,
  now(),
  case when o.is_demo then null else now() + interval '30 days' end,
  case when o.is_demo then 'monthly' else 'trial' end
from public.organizations o
where not exists (select 1 from public.subscriptions s where s.organization_id = o.id);

-- Read-only usage vs. quota, one row per organization. security_invoker so the
-- underlying RLS (organizations / memberships / branches / departments /
-- invitations) decides which rows a caller can see.
create view public.organization_usage
with (security_invoker = on) as
select
  o.id as organization_id,
  s.plan_id,
  s.status as subscription_status,
  s.trial_ends_at,
  p.max_active_employees,
  p.max_departments,
  p.max_managers,
  p.max_branches,
  coalesce(m.active_employees, 0) as active_employees,
  coalesce(m.active_managers, 0) as active_managers,
  coalesce(b.active_branches, 0) as active_branches,
  coalesce(d.active_departments, 0) as active_departments,
  coalesce(i.pending_invitations, 0) as pending_invitations
from public.organizations o
left join public.subscriptions s on s.organization_id = o.id
left join public.plans p on p.id = s.plan_id
left join lateral (
  select
    count(*) filter (where role = 'employee') as active_employees,
    count(*) filter (where role in ('owner', 'admin', 'manager')) as active_managers
  from public.organization_memberships
  where organization_id = o.id and status = 'active'
) m on true
left join lateral (
  select count(*) as active_branches
  from public.branches
  where organization_id = o.id and active
) b on true
left join lateral (
  select count(*) as active_departments
  from public.departments
  where organization_id = o.id and active
) d on true
left join lateral (
  select count(*) as pending_invitations
  from public.organization_invitations
  where organization_id = o.id and status = 'pending'
) i on true;

grant select on public.organization_usage to authenticated;

comment on table public.plans is
  'Commercial plan catalogue (launch prices, ILS, pre-VAT). Mirrors lib/plans.ts.';
comment on table public.subscriptions is
  'Per-organization subscription and trial state. Written only by SECURITY DEFINER RPCs and the service role.';
comment on view public.organization_usage is
  'Read-only usage counts vs. plan quota per organization; no enforcement.';
