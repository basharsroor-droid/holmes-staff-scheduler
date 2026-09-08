import { test } from "node:test";
import assert from "node:assert/strict";

const plans = await import(new URL("../../lib/plans.ts", import.meta.url));
const {
  PLANS,
  ADDONS,
  getPlan,
  recommendPlan,
  formatMonthlyPrice,
  launchOfferMonthlyIls,
  LAUNCH_OFFER,
  DEFAULT_TRIAL_PLAN_ID,
  TRIAL_DAYS
} = plans;

test("plan catalogue is ordered small -> large and internally consistent", () => {
  assert.deepEqual(
    PLANS.map((p) => p.id),
    ["solo", "business", "business_pro", "network", "enterprise"]
  );

  const paid = PLANS.filter((p) => p.monthlyIls !== null);
  for (let i = 1; i < paid.length; i += 1) {
    assert.ok(
      paid[i].monthlyIls > paid[i - 1].monthlyIls,
      `${paid[i].id} monthly price must exceed ${paid[i - 1].id}`
    );
    // Quotas never shrink as you move up a paid tier.
    for (const q of ["maxActiveEmployees", "maxDepartments", "maxManagers", "maxBranches"]) {
      assert.ok(paid[i][q] >= paid[i - 1][q], `${paid[i].id}.${q} must not be smaller than ${paid[i - 1].id}`);
    }
  }

  // Annual price is ~two months free (10x monthly) on every paid tier.
  for (const p of paid) {
    assert.equal(p.annualIls, p.monthlyIls * 10, `${p.id} annual should be 10x monthly`);
  }

  assert.equal(getPlan("enterprise").monthlyIls, null);
  assert.equal(getPlan("enterprise").customFromIls, 899);
  assert.ok(PLANS.some((p) => p.badge)); // exactly one "most popular"
  assert.equal(PLANS.filter((p) => p.badge).length, 1);
  assert.ok(ADDONS.length > 0);
  assert.equal(DEFAULT_TRIAL_PLAN_ID, "business");
  assert.equal(TRIAL_DAYS, 30);
});

test("recommendPlan picks the smallest tier that covers every quota", () => {
  assert.equal(recommendPlan({ employees: 4, branches: 1, departments: 1 }), "solo");
  assert.equal(recommendPlan({ employees: 10, branches: 1, departments: 1 }), "solo");
  assert.equal(recommendPlan({ employees: 11, branches: 1, departments: 1 }), "business");
  assert.equal(recommendPlan({ employees: 30, branches: 1, departments: 3, managers: 5 }), "business");
  // One extra manager over the Business cap bumps to Business Pro.
  assert.equal(recommendPlan({ employees: 20, branches: 1, departments: 2, managers: 6 }), "business_pro");
  assert.equal(recommendPlan({ employees: 80, branches: 1, departments: 10 }), "business_pro");
  // A second branch now lands on `network`, not straight to enterprise.
  assert.equal(recommendPlan({ employees: 40, branches: 2, departments: 4 }), "network");
  assert.equal(recommendPlan({ employees: 150, branches: 3, departments: 20, managers: 25 }), "network");
  // Beyond the network caps -> enterprise.
  assert.equal(recommendPlan({ employees: 151, branches: 3, departments: 5 }), "enterprise");
  assert.equal(recommendPlan({ employees: 40, branches: 4, departments: 4 }), "enterprise");
});

test("formatMonthlyPrice", () => {
  assert.equal(formatMonthlyPrice(getPlan("business")), "₪179 לחודש");
  assert.equal(formatMonthlyPrice(getPlan("enterprise")), "לפי הצעה מותאמת");
});

test("launch offer applies the configured discount to paid tiers only", () => {
  assert.equal(LAUNCH_OFFER.discountPercent, 25);
  assert.equal(launchOfferMonthlyIls(getPlan("solo")), 52); // round(69 * 0.75)
  assert.equal(launchOfferMonthlyIls(getPlan("business")), 134); // round(179 * 0.75)
  assert.equal(launchOfferMonthlyIls(getPlan("business_pro")), 254);
  assert.equal(launchOfferMonthlyIls(getPlan("network")), 412);
  assert.equal(launchOfferMonthlyIls(getPlan("enterprise")), null);
});
