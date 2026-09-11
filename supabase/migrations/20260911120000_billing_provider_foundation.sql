-- Provider-neutral billing foundation.
--
-- This migration deliberately does NOT connect a payment provider, store card
-- numbers, expose checkout, or charge customers. It only prepares the database
-- so a provider such as Grow can be wired later without changing the core
-- subscription model.

alter table public.subscriptions
  add column if not exists billing_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_payment_method_id text,
  add column if not exists currency text not null default 'ILS',
  add column if not exists billing_anchor_at timestamptz,
  add column if not exists next_charge_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists launch_offer_eligible boolean not null default false,
  add column if not exists launch_offer_months_remaining integer not null default 0,
  add column if not exists last_payment_at timestamptz,
  add column if not exists last_payment_failure_at timestamptz;

alter table public.subscriptions
  add constraint subscriptions_currency_check
    check (currency = 'ILS'),
  add constraint subscriptions_launch_offer_months_check
    check (launch_offer_months_remaining between 0 and 3),
  add constraint subscriptions_provider_pair_check
    check (
      (billing_provider is null and provider_subscription_id is null)
      or billing_provider is not null
    );

create index if not exists subscriptions_provider_customer_idx
  on public.subscriptions (billing_provider, provider_customer_id)
  where provider_customer_id is not null;

create index if not exists subscriptions_provider_subscription_idx
  on public.subscriptions (billing_provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists subscriptions_next_charge_idx
  on public.subscriptions (next_charge_at)
  where status in ('active', 'past_due', 'grace_period');

-- Idempotent inbox for future provider webhooks. Clients never write or read
-- this table directly; webhook handlers will use the service role. Keeping raw
-- JSON is intentional for audit/debugging, while dedupe happens on the provider
-- event id.
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_events_org_created_idx
  on public.billing_events (organization_id, created_at desc);

create index if not exists billing_events_status_idx
  on public.billing_events (processing_status, created_at)
  where processing_status in ('received', 'failed');

alter table public.billing_events enable row level security;

-- No client policies on purpose: deny-by-default under RLS. Future webhook and
-- reconciliation code must use the service role. Do not grant client access.
revoke all on public.billing_events from anon, authenticated;

comment on column public.subscriptions.billing_provider is
  'Payment provider key (for example grow) once billing is connected; NULL while billing is disabled.';
comment on column public.subscriptions.provider_payment_method_id is
  'Opaque provider token/reference only. Never store PAN/card number/CVV in ShiftPilot.';
comment on column public.subscriptions.launch_offer_months_remaining is
  'Remaining discounted monthly invoices in the launch offer; 0 for annual/custom/non-eligible subscriptions.';
comment on table public.billing_events is
  'Provider-neutral webhook inbox for idempotency/audit. Service-role only; no live billing provider is connected yet.';
