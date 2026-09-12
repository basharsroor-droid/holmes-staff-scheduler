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

## Checkout page (template, not live)

`/workspace/subscription/checkout` (owner/admin) is built and linked from "המנוי שלי": plan and period are chosen by link (`?plan=&period=`, parsed by `parseCheckoutSelection`, self-serve plans only), the order summary comes from `quoteInvoice` (first charge, launch offer, charges after the offer), and it warns when current usage exceeds the chosen plan's quotas. The pay button is **disabled**. To go live: add a server action that builds the `BillingGateway` adapter, calls `createCheckout({ organizationId, planId, period, customerEmail })` and redirects to the provider's hosted page; enable the button only when `resolveBillingProvider(process.env.BILLING_PROVIDER).enabled` **and** an adapter exists. `BILLING_PROVIDER` is server-only and defaults to disabled.

## Plan change and cancellation (live, trial only)

Migration `20260912090000_subscription_plan_change.sql` adds the only write path to `public.subscriptions`, since the client has SELECT and nothing else:

- `change_subscription_plan(target_plan_id, target_period)` — owner only, **only while `status = 'trialing'`**, never to `enterprise` (custom quote), and refused when the workspace already exceeds the target plan's quotas (`subscription_change:over_quota:<resource>`, counted exactly like `private.assert_plan_capacity`).
- `cancel_subscription()` — owner only. Records intent (`cancel_at_period_end`, `canceled_at`); the workspace keeps working until the trial ends. **Nothing in the product locks a workspace when a trial expires yet** — that transition arrives with the provider's webhook or a scheduled job.
- `resume_subscription()` — owner only, undoes a pending cancellation.

Every call writes an `audit_logs` row (`subscriptions.plan_change` / `.cancel` / `.resume`). `lib/subscription-changes.ts` holds the pure half (plan order, the same quota comparison the screen shows before the click, Hebrew messages) and is unit-tested.

Once billing starts, a plan change moves money (proration, refunds, invoices) and belongs to the provider: the RPC refuses with `subscription_change:requires_billing_provider` and "המנוי שלי" sends the owner to support.

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
