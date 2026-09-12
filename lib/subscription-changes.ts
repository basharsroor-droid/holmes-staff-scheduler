// Plan changes and cancellation, the part that needs no payment provider
// (J2 in docs/REMEDIATION_PLAN.md, see docs/BILLING_FOUNDATION.md).
//
// The database owns the rules (migration 20260912090000): only the owner may
// change a plan, only while the workspace is still in its trial, and a smaller
// plan is refused while usage exceeds its quotas. This module is the pure half:
// the plan order, the same quota comparison the UI shows before the click, and
// the Hebrew message for every error the RPCs raise.
//
// No "@/" imports on purpose: tests/unit loads this file directly with Node's
// type stripping, which cannot resolve the alias.

import { PLANS, getPlan, type Plan, type PlanId } from "./plans.ts";

/** Plans from smallest to largest. Enterprise is last: it is a custom quote. */
export const PLAN_ORDER: PlanId[] = PLANS.map((plan) => plan.id);

export type PlanChangeKind = "upgrade" | "downgrade" | "same";

export function planChangeKind(currentPlanId: PlanId, targetPlanId: PlanId): PlanChangeKind {
  const current = PLAN_ORDER.indexOf(currentPlanId);
  const target = PLAN_ORDER.indexOf(targetPlanId);
  if (current === -1 || target === -1) throw new Error(`Unknown plan: ${current === -1 ? currentPlanId : targetPlanId}`);
  if (target === current) return "same";
  return target > current ? "upgrade" : "downgrade";
}

export type UsageSnapshot = {
  activeEmployees: number;
  activeManagers: number;
  activeBranches: number;
  activeDepartments: number;
};

export type QuotaViolation = { resource: "employee" | "manager" | "branch" | "department"; label: string; used: number; max: number };

/**
 * Quotas the workspace already exceeds on the target plan. Empty means the
 * plan fits. Mirrors private.assert_plan_capacity: a null quota (enterprise)
 * is unlimited, and only usage above the quota counts -- being exactly at it
 * is fine, it just leaves no room to grow.
 */
export function quotaViolations(targetPlan: Plan, usage: UsageSnapshot): QuotaViolation[] {
  const rows: { resource: QuotaViolation["resource"]; label: string; used: number; max: number | null }[] = [
    { resource: "employee", label: "עובדים פעילים", used: usage.activeEmployees, max: targetPlan.maxActiveEmployees },
    { resource: "manager", label: "מנהלים", used: usage.activeManagers, max: targetPlan.maxManagers },
    { resource: "branch", label: "סניפים", used: usage.activeBranches, max: targetPlan.maxBranches },
    { resource: "department", label: "מחלקות", used: usage.activeDepartments, max: targetPlan.maxDepartments }
  ];
  return rows.filter((row): row is QuotaViolation => row.max !== null && row.used > row.max);
}

/** Plans the owner can switch to online: every plan with a list price. */
export function selfServePlans(): Plan[] {
  return PLANS.filter((plan) => plan.monthlyIls !== null);
}

const RESOURCE_LABELS: Record<QuotaViolation["resource"], string> = {
  employee: "עובדים פעילים",
  manager: "מנהלים",
  branch: "סניפים",
  department: "מחלקות"
};

/**
 * Hebrew explanation for the errors the subscription RPCs raise, or null for
 * anything else (the caller then shows its own generic message).
 */
export function subscriptionErrorMessage(error: { message?: string } | null | undefined): string | null {
  const message = error?.message ?? "";

  const overQuota = /subscription_change:over_quota:(employee|manager|branch|department)\b/.exec(message);
  if (overQuota) {
    const resource = overQuota[1] as QuotaViolation["resource"];
    return `העסק חורג ממכסת ה${RESOURCE_LABELS[resource]} של המסלול הזה — צריך לצמצם קודם, או לבחור מסלול גדול יותר`;
  }
  if (message.includes("subscription_change:not_owner")) {
    return "רק בעל העסק יכול לשנות מסלול או לבטל מנוי";
  }
  if (message.includes("subscription_change:enterprise_requires_quote")) {
    return "מסלול Enterprise נקבע בהצעה מותאמת — פתחו פנייה ונחזור אליכם";
  }
  if (message.includes("subscription_change:requires_billing_provider")) {
    return "שינוי מסלול אחרי תחילת החיוב עדיין נעשה מול הצוות שלנו — פתחו פנייה ונטפל בזה";
  }
  if (message.includes("subscription_change:unknown_plan")) {
    return "המסלול שנבחר אינו קיים";
  }
  if (message.includes("subscription_change:no_subscription")) {
    return "לא נמצא מנוי לעסק — פתחו פנייה ונסדר את זה";
  }
  if (message.includes("subscription_change:not_canceled")) {
    return "המנוי אינו מסומן לביטול";
  }
  return null;
}
