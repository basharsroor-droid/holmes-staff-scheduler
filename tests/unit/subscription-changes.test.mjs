import { test } from "node:test";
import assert from "node:assert/strict";

const { PLAN_ORDER, planChangeKind, quotaViolations, selfServePlans, subscriptionErrorMessage } = await import(
  new URL("../../lib/subscription-changes.ts", import.meta.url)
);
const { getPlan } = await import(new URL("../../lib/plans.ts", import.meta.url));

const usage = { activeEmployees: 12, activeManagers: 3, activeBranches: 1, activeDepartments: 2 };

test("plans are ordered from smallest to largest, enterprise last", () => {
  assert.deepEqual(PLAN_ORDER, ["solo", "business", "business_pro", "network", "enterprise"]);
});

test("a change is classified as upgrade, downgrade or same", () => {
  assert.equal(planChangeKind("business", "business_pro"), "upgrade");
  assert.equal(planChangeKind("business", "solo"), "downgrade");
  assert.equal(planChangeKind("network", "network"), "same");
  assert.throws(() => planChangeKind("business", "gold"), /Unknown plan/);
});

test("a smaller plan reports every quota the workspace already exceeds", () => {
  // Solo allows 10 employees, 1 manager and 1 department; this workspace has
  // 12, 3 and 2. Branches fit (1 of 1), so they are not reported.
  const violations = quotaViolations(getPlan("solo"), usage);
  assert.deepEqual(
    violations.map((row) => [row.resource, row.used, row.max]),
    [
      ["employee", 12, 10],
      ["manager", 3, 1],
      ["department", 2, 1]
    ]
  );
});

test("a plan that fits reports nothing, and being exactly at the quota still fits", () => {
  assert.deepEqual(quotaViolations(getPlan("business"), usage), []);
  const exactly = { activeEmployees: 10, activeManagers: 1, activeBranches: 1, activeDepartments: 1 };
  assert.deepEqual(quotaViolations(getPlan("solo"), exactly), []);
});

test("enterprise quotas are unlimited", () => {
  const huge = { activeEmployees: 5000, activeManagers: 300, activeBranches: 40, activeDepartments: 90 };
  assert.deepEqual(quotaViolations(getPlan("enterprise"), huge), []);
});

test("only plans with a list price can be chosen online", () => {
  const ids = selfServePlans().map((plan) => plan.id);
  assert.deepEqual(ids, ["solo", "business", "business_pro", "network"]);
});

test("every RPC error gets a Hebrew explanation, and anything else stays null", () => {
  assert.match(subscriptionErrorMessage({ message: "subscription_change:over_quota:manager" }), /מנהלים/);
  assert.match(subscriptionErrorMessage({ message: "subscription_change:not_owner" }), /רק בעל העסק/);
  assert.match(subscriptionErrorMessage({ message: "subscription_change:requires_billing_provider" }), /מול הצוות שלנו/);
  assert.match(subscriptionErrorMessage({ message: "subscription_change:enterprise_requires_quote" }), /Enterprise/);
  assert.match(subscriptionErrorMessage({ message: "subscription_change:no_subscription" }), /לא נמצא מנוי/);
  assert.equal(subscriptionErrorMessage({ message: "some other database error" }), null);
  assert.equal(subscriptionErrorMessage(null), null);
});

test("messages carry no trailing period, per the copy rules", () => {
  for (const code of [
    "subscription_change:over_quota:employee",
    "subscription_change:not_owner",
    "subscription_change:requires_billing_provider",
    "subscription_change:enterprise_requires_quote",
    "subscription_change:unknown_plan",
    "subscription_change:no_subscription",
    "subscription_change:not_canceled"
  ]) {
    const message = subscriptionErrorMessage({ message: code });
    assert.ok(message && !message.endsWith("."), code);
  }
});
