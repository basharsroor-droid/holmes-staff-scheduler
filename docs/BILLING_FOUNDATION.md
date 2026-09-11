# ShiftPilot billing foundation

Status: **prepared, provider disabled**.

This layer exists so ShiftPilot can finish product/pilot work before connecting a live payment provider. No checkout, card capture, provider API key, webhook route or automatic charge is enabled by this change.

## Current commercial rules

- 30-day trial, no card required.
- Monthly or annual billing after the trial.
- Annual price = 10× monthly price on paid self-serve tiers.
- Launch offer: workspaces created on or before 2026-12-31 receive 25% off the first 3 **monthly** paid invoices.
- Annual billing does not stack the launch offer.
- Enterprise remains custom quote.
- `lib/plans.ts` remains the plan/price source of truth.
- `lib/billing.ts` owns provider-neutral invoice quoting.

## Database preparation

`public.subscriptions` gains only provider-neutral references and billing lifecycle fields:

- `billing_provider`
- `provider_customer_id`
- `provider_subscription_id`
- `provider_payment_method_id`
- `currency`
- `billing_anchor_at`
- `next_charge_at`
- `cancel_at_period_end`
- `canceled_at`
- `launch_offer_eligible`
- `launch_offer_months_remaining`
- `last_payment_at`
- `last_payment_failure_at`

Provider identifiers are opaque references only. **Never store a card number (PAN), CVV or raw payment credentials in ShiftPilot.**

`public.billing_events` is a service-role-only webhook inbox prepared for future idempotency, reconciliation and audit. It has no client RLS policies and therefore denies normal client access.

## Provider contract

Every future adapter implements `BillingGateway` from `lib/billing.ts`:

1. create checkout/payment setup;
2. cancel a provider subscription;
3. authenticate and parse webhook events.

The product pricing rules stay in ShiftPilot. A provider receives the final amount or plan instruction; it does not become the source of truth for ShiftPilot prices.

## When we connect Grow (or another provider)

Do this only when ShiftPilot is ready to collect money:

1. Create provider account/merchant terminal and obtain production + sandbox credentials.
2. Add encrypted environment secrets in Vercel/GitHub as appropriate; never commit them.
3. Implement a provider adapter (initial candidate: Grow) behind `BillingGateway`.
4. Add authenticated checkout/payment-method setup for organization owners only.
5. Add a webhook endpoint that verifies the provider signature **before** writing `billing_events`.
6. Deduplicate webhooks using `(provider, provider_event_id)`.
7. Update `subscriptions` only from trusted server-side code/service role.
8. Map successful/failed charges to `active`, `past_due`, `grace_period`, `read_only` using an explicit lifecycle policy.
9. Generate/send the legally required Israeli document through the selected provider/accounting integration.
10. Add sandbox E2E: trial -> checkout -> first discounted invoice -> webhook -> active subscription -> failed payment -> recovery/cancel.
11. Run a small real-money production charge/refund before enabling checkout publicly.

## Deliberately not implemented yet

- Live Grow/Cardcom/Tranzila/PayPlus/Hyp API calls.
- Payment form or card collection.
- Billing webhook route.
- Automatic recurring charges.
- Invoice/receipt issuance.
- Dunning/grace-period automation.
- Customer billing portal.

Those are the final integration slice, not prerequisites for the pilot.
