# ShiftPilot — Launch Pricing & Competitive Benchmark

_Last updated: 2026-09-08. Prices are launch prices, ILS, **pre-VAT**._
_Currency conversion uses ≈ ₪3.7 / $1 (Sept 2026, approximate — competitor USD
prices move and should be re-checked before any external use)._

Single source of truth for the numbers: [`lib/plans.ts`](../lib/plans.ts),
mirrored into `public.plans` by migrations
`20260903120000_subscription_foundation.sql` +
`20260907120000_plan_launch_prices_v2.sql`. Covered by
[`tests/unit/plans.test.mjs`](../tests/unit/plans.test.mjs).

---

## 1. ShiftPilot launch prices (current)

| Plan | Monthly | Annual (≈/mo) | Employees | Departments | Managers | Branches |
|---|--:|--:|--:|--:|--:|--:|
| מנהל עצמאי (`solo`) | **₪69** | ₪690 (₪58) | 10 | 1 | 1 | 1 |
| עסק (`business`) — *הפופולרי* | **₪179** | ₪1,790 (₪149) | 30 | 3 | 5 | 1 |
| Business Pro (`business_pro`) | **₪339** | ₪3,390 (₪283) | 80 | 10 | 15 | 1 |
| רשת (`network`) | **₪549** | ₪5,490 (₪458) | 150 | 20 | 25 | 3 |
| Enterprise (`enterprise`) | **custom, from ₪899** | — | ∞ | ∞ | ∞ | 4+ |

Ladder ratios: 69 → 179 (×2.6) → 339 (×1.9) → 549 (×1.6) → 899 (×1.6).
Multipliers shrink as you climb — standard SaaS shape.

Annual = 10× monthly on every paid tier (≈ two months free).

Add-ons (unchanged): extra department ₪29/mo, +10 employees ₪25/mo, extra manager
₪10/mo, extra branch from ₪99/mo, onboarding ₪299 one-off, data import from ₪199
one-off, custom/integration — quote.

### Changes from the first draft

| Plan | Was | Now | Why |
|---|--:|--:|---|
| solo | ₪59 / ₪590 | ₪69 / ₪690 | Keeps the acquisition wedge (still the cheapest paid shift tool in market) while lifting a thin-margin tier off break-even. |
| business | ₪129 / ₪1,290 | ₪179 / ₪1,790 | Draft sat **at Connecteam's cheapest _Basic_ tier** (₪107–130) while being the main plan. ₪179 lands just under Connecteam _Advanced_ (₪181) and Homebase _Plus_ (₪207). +1 manager seat (4→5) softens the raise. |
| business_pro | ₪259 / ₪2,590 | ₪339 / ₪3,390 | Undercuts 7shifts _Pro_ (₪296 for only 60 employees) on capacity and Connecteam _Expert_ (₪366) on price. Quota bump: 8→10 departments, 12→15 managers. |
| **network** | — (did not exist) | **₪549 / ₪5,490** | New. Removes the cliff where opening a 2nd branch forced a custom-quote sales motion. Every competitor prices multi-location smoothly; we now do too, up to 3 branches / 150 employees. |
| enterprise | from ₪499 | from ₪899, now means **4+ branches** | ₪499 anchored the custom tier below competitors' _self-serve_ plans and every Israeli incumbent's multi-branch quote. |

---

## 2. The market (normalised to "schedule ~30 employees, 1 location")

| Product | Model | Entry paid | Mid tier (≈30 emp) | Top self-serve | Free tier |
|---|---|--:|--:|--:|---|
| **ShiftPilot** (new) | flat / org | ₪69 (10 emp) | **₪179** | ₪549 (3 branches) | — (30-day trial) |
| **Connecteam** 🇮🇱 | flat, first 30 users | $29–35 → ₪107–130 | Advanced $49–59 → **₪181–218** | Expert $99–119 → ₪366–440 | ≤10 users |
| **7shifts** | flat / location | Essentials $39.99 → ₪148 (≤30) | Pro $79.99 → **₪296** (≤60) | Premium $134.99 → ₪500 | ≤15 emp / 1 loc |
| **Homebase** | flat / location, unlimited emp | Essentials $24.95 → ₪92 | Plus $56 → **₪207** | All-in-One $96 → ₪355 | ≤10 emp / 1 loc |
| **Sling** | per user | Premium $2/user → ₪222 | Business $4/user → **₪444** | — | **≤30 users** (real) |
| **When I Work** | per user | $2.50/user (1 loc) → ₪278 | multi-loc $5/user → **₪555** | ~$8/user → ₪888 | trial only |
| **Deputy** | per user | Lite $5/user → ₪555 | Core $6.50/user → **₪722** | Pro $9/user → ₪999 | trial only |
| **Israeli incumbents** (Otipo, Mishmarot, EZshift, EZTime, Hilan נוכחות, TimeTable) | sales-led quote; often per-employee and/or setup fee | no public price | ~₪250–700+/mo, freq. ₪8–15/emp + setup ₪500–2,000 | — | case-by-case |

Reading:
- **Connecteam** is the closest comp — Israeli, ILS billing, flat-for-first-30.
  `business` (₪179) sits deliberately between its Basic and Advanced.
- **7shifts / Homebase** confirm the flat-per-org model and put a serious
  30-employee plan in the **₪200–300** band.
- **Per-user tools (Deputy, When I Work, Sling)** all cost ₪440–720 for the same
  30 employees. The flat-per-org model is a structural price advantage — the
  pricing page states it ("מחיר קבוע לעסק — לא לפי מספר עובדים").
- **Sling free ≤30 users** is the real pressure on the low end. The answer is
  Hebrew-first product + local support, not price.

---

## 3. Positioning statement

> ShiftPilot is the **value leader for Hebrew-first shift scheduling** — a fixed
> monthly price per business (never per employee), priced 15–25% below the
> international flat-plan tools and far below the per-user tools and the local
> attendance-suite incumbents, with native RTL, Israeli labor context, and
> business-hours support in Hebrew.

This justifies _not_ being the cheapest sticker (Homebase Essentials, Connecteam
Basic, Sling free all undercut `business`): those are stripped entry tiers or
English-first products with no local support. `business` is a complete plan.

---

## 4. מבצע השקה (launch offer)

**25% off the first 3 monthly invoices, every paid tier, for any workspace
created on or before 2026-12-31. Monthly billing only** (the annual price already
bakes in ~two months free). Applied automatically at first charge, after the
30-day trial. Config: [`LAUNCH_OFFER` in `lib/plans.ts`](../lib/plans.ts).

First-3-months price: solo ₪52 · business ₪134 · Business Pro ₪254 · network ₪412.

**Why this shape:**
- Hits the exact friction moment ("is ₪179 worth it?") with a visible deal.
- 25% (not 50%) keeps the step-up to list price gentle — less churn at month 4.
- A dated window creates urgency without a permanent margin liability.
- Does **not** touch list price or long-term ARPU.

**Deliberately avoided:** lifetime-locked discounts for early customers. Pricing
isn't validated yet; locking the lowest margins onto the earliest (and
loudest / best-referring) cohort makes the next price increase a mess.

**Runway note:** trial (30 days, no card) + 3 months at 25% off = ~4 months
before full-rate revenue per customer. Acceptable pre-launch land-grab; revisit
once acquisition is steady.

**Separate, off-page:** hand-picked founding partners (~first 10) — bigger
discount or free year in exchange for feedback, a logo and a reference. A manual
sales arrangement, not a coupon.

### Implementation status

No billing provider is wired yet (`lib/plans.ts`, `subscriptions` table have no
coupon concept). Today the offer is a **published commitment** surfaced on
`/pricing` (ribbon + per-card line + FAQ) and in onboarding, plus the sales
materials. When checkout is built:
- add it as a provider coupon — Stripe: `percent_off: 25`,
  `duration: repeating`, `duration_in_months: 3`, auto-applied for signups
  before `LAUNCH_OFFER.endsOn`;
- or, if a bespoke path is preferred, `promo_code` + `discount_*` columns on
  `public.subscriptions` and a `promotions` table.
- Eligibility key = workspace `created_at` ≤ `endsOn` (already recorded).

---

## 5. Follow-ups / open questions

- **Price-lock as retention, later.** Offer existing customers "your price won't
  rise for 12 months" at the point the first list-price increase ships — costs
  nothing now, rewards loyalty, softens the increase.
- **`business` 30-employee cap is tight** for restaurants with many part-timers
  (kitchen + floor + bar). Onboarding should show "28/30" clearly so the Pro
  upgrade or the +10 add-on feels natural, not punitive.
- **Validate before locking numbers** — run ~10 design partners and watch where
  they stall: price, quota cap, or "wait, there's a free option". Not knowable
  from a desk.
- **VAT display** — keep "לא כולל מע״מ" prominent; many small owners read the
  final number.

---

## 6. Sources

- [Connecteam pricing](https://connecteam.com/pricing/) ·
  [actitime breakdown](https://www.actitime.com/software-collections/connecteam-pricing)
- [Deputy pricing (SelectHub)](https://www.selecthub.com/p/employee-scheduling-software/deputy/) ·
  [Deputy (G2)](https://www.g2.com/products/deputy/pricing)
- [When I Work pricing (Capterra)](https://www.capterra.com/p/121248/When-I-Work/pricing/) ·
  [When I Work (G2)](https://www.g2.com/products/when-i-work/pricing)
- [7shifts pricing (costbench)](https://costbench.com/software/employee-scheduling/7shifts/) ·
  [7shifts (workstream)](https://www.workstream.us/blog/7shifts-pricing)
- [Homebase pricing (Capterra)](https://www.capterra.com/p/153076/Homebase/pricing/) ·
  [Homebase (workstream)](https://www.workstream.us/blog/homebase-pricing)
- [Sling pricing (CheckThat.ai)](https://checkthat.ai/brands/sling/pricing) ·
  [Sling (Capterra)](https://www.capterra.com/p/142542/Sling/)
- Israeli incumbents (no public pricing): [Otipo](https://otipo.co.il/d/about/),
  [Mishmarot](https://mishmarot.com/), [EZshift](https://www.ezshift.co.il/),
  [EZTime](https://www.eztime.co.il/), [Hilan נוכחות](https://www.hilan.co.il/),
  [TimeTable](https://timetable.co.il/)
