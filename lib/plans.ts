// Single source of truth for ShiftPilot's commercial plans, add-ons and the
// trial length. The public pricing page (app/pricing), the onboarding
// plan-recommendation step (app/onboarding) and the trial indicator all read
// from here.
//
// The `public.plans` table is seeded/updated from these same numbers in the
// migrations 20260903120000_subscription_foundation.sql and
// 20260907120000_plan_launch_prices_v2.sql -- keep the two in sync.
// `npm run validate:schema` does NOT catch value drift between them;
// tests/unit/plans.test.mjs guards the lib/plans.ts side.
//
// Prices are the launch prices ("מחיר השקה"), in ILS, before VAT. Source:
// the pricing review (Artifact add694c4), the pricing model document
// "תמחור, ניסיון והקמת עסק" v1.0, and the 2026-09 competitive benchmark in
// docs/PRICING_BENCHMARK.md (Connecteam / 7shifts / Homebase / Deputy / When I
// Work / Sling, converted to ILS). Positioning: undercut the international
// flat-plan tools by ~15-25% while charging meaningfully more than the first
// draft, which sat at or below the cheapest serious comparable.

export const TRIAL_DAYS = 30;

// The plan every organization starts its trial on (business-tier quotas),
// per the pricing document §6.
export const DEFAULT_TRIAL_PLAN_ID = "business";

// Launch promotion. Any workspace created on or before `endsOn` gets
// `discountPercent` off its first `months` monthly invoices (monthly billing
// only -- the annual price already bakes in ~two months free). There is no
// billing provider yet, so today this is a published commitment surfaced on
// /pricing and in onboarding; when checkout is built it becomes a provider
// coupon (e.g. Stripe: percent_off, duration=repeating, duration_in_months).
// See docs/PRICING_BENCHMARK.md §"מבצע השקה".
export const LAUNCH_OFFER = {
  discountPercent: 25,
  months: 3,
  /** ISO date, inclusive. Workspaces created after this pay list price. */
  endsOn: "2026-12-31",
  billing: "monthly" as const
};

export type PlanId = "solo" | "business" | "business_pro" | "network" | "enterprise";

export type Plan = {
  id: PlanId;
  /** Hebrew display name. */
  name: string;
  /** Short marketing line under the name. */
  tagline: string;
  /** Optional badge, e.g. the "most popular" flag on the business plan. */
  badge?: string;
  /** Monthly launch price in ILS before VAT. `null` = custom quote. */
  monthlyIls: number | null;
  /** Annual launch price in ILS before VAT (≈ two months free). `null` = custom quote. */
  annualIls: number | null;
  /** Quota: active employees. `null` = custom / unbounded. */
  maxActiveEmployees: number | null;
  /** Quota: departments. `null` = custom. */
  maxDepartments: number | null;
  /** Quota: managers (owner + admin + manager seats). `null` = custom. */
  maxManagers: number | null;
  /** Quota: branches. `null` = custom. */
  maxBranches: number | null;
  /** For custom-quote plans only: the "starting from" monthly price in ILS shown on the card. */
  customFromIls?: number;
  /** Feature bullets shown on the pricing card. */
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "מנהל עצמאי",
    tagline: "למנהל צוות, אחראי משמרת או בעל עסק קטן",
    monthlyIls: 69,
    annualIls: 690,
    maxActiveEmployees: 10,
    maxDepartments: 1,
    maxManagers: 1,
    maxBranches: 1,
    features: [
      "סביבת עבודה אחת עם סניף ומחלקה",
      "עד 10 עובדים פעילים",
      "הגשת זמינות, בניית סידור ופרסום",
      "בקשות מסירת משמרת והחלפה",
      "הערות והתראות בתוך המערכת",
      "תמיכה רגילה"
    ]
  },
  {
    id: "business",
    name: "עסק",
    tagline: "לעסק עם צוות אחד ועד שלוש מחלקות",
    badge: "הפופולרי ביותר",
    monthlyIls: 179,
    annualIls: 1790,
    maxActiveEmployees: 30,
    maxDepartments: 3,
    maxManagers: 5,
    maxBranches: 1,
    features: [
      "עד 30 עובדים פעילים",
      "עד 3 מחלקות ועד 5 מנהלים",
      "הרשאות לפי מחלקה ושיוך מנהל לכמה מחלקות",
      "סידור עצמאי לכל מחלקה",
      "תצוגת ניהול מרכזית לבעל העסק",
      "היסטוריית סידורים ופעולות",
      "תמיכה מועדפת"
    ]
  },
  {
    id: "business_pro",
    name: "Business Pro",
    tagline: "לעסק גדול, מועדון, מסעדה, מלון או ארגון רב־צוותי",
    monthlyIls: 339,
    annualIls: 3390,
    maxActiveEmployees: 80,
    maxDepartments: 10,
    maxManagers: 15,
    maxBranches: 1,
    features: [
      "עד 80 עובדים פעילים",
      "עד 10 מחלקות ועד 15 מנהלים",
      "ניהול מרכזי של כל המחלקות",
      "הרשאות מתקדמות",
      "דוחות ואנליטיקה",
      "יומן פעולות מלא (Audit Log)",
      "הכנה לאינטגרציות עתידיות"
    ]
  },
  {
    id: "network",
    name: "רשת",
    tagline: "לעסק עם עד שלושה סניפים ושיתוף עובדים ביניהם",
    monthlyIls: 549,
    annualIls: 5490,
    maxActiveEmployees: 150,
    maxDepartments: 20,
    maxManagers: 25,
    maxBranches: 3,
    features: [
      "עד 3 סניפים ועד 150 עובדים פעילים",
      "עד 20 מחלקות ועד 25 מנהלים",
      "שיתוף עובדים בין סניפים",
      "דוחות מרכזיים לכל הסניפים",
      "כל היכולות של Business Pro",
      "ליווי הקמה מותאם"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "לרשת עם ארבעה סניפים ומעלה, מעל 150 עובדים או דרישות מיוחדות",
    monthlyIls: null,
    annualIls: null,
    maxActiveEmployees: null,
    maxDepartments: null,
    maxManagers: null,
    maxBranches: null,
    customFromIls: 899,
    features: [
      "4 סניפים ומעלה, ללא מגבלת מכסה",
      "מחלקות, מנהלים ועובדים ללא מגבלת מכסה",
      "דוחות מרכזיים לכל הרשת",
      "הדרכה והטמעה אישית",
      "אינטגרציות ודרישות אבטחה ודיווח מותאמות",
      "הצעת מחיר מותאמת — החל מ-899 ₪ לחודש"
    ]
  }
];

export type Addon = {
  label: string;
  price: string;
};

export const ADDONS: Addon[] = [
  { label: "מחלקה נוספת", price: "29 ₪ לחודש" },
  { label: "חבילת 10 עובדים נוספים", price: "25 ₪ לחודש" },
  { label: "מנהל נוסף מעבר למכסה", price: "10 ₪ לחודש" },
  { label: "סניף נוסף", price: "החל מ-99 ₪ לחודש" },
  { label: "הקמה והדרכה אישית", price: "299 ₪ חד־פעמי" },
  { label: "ייבוא עובדים והגדרות", price: "החל מ-199 ₪ חד־פעמי" },
  { label: "התאמה או אינטגרציה מיוחדת", price: "הצעת מחיר" }
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown plan id: ${id}`);
  return plan;
}

export type RecommendInput = {
  employees: number;
  branches: number;
  departments: number;
  managers?: number;
};

// Returns the smallest plan whose every quota covers the input. Multi-branch
// businesses land on `network` (up to 3 branches / 150 employees); anything
// larger, or that no listed plan covers, lands on enterprise (custom quote).
export function recommendPlan(input: RecommendInput): PlanId {
  const managers = input.managers ?? 1;

  for (const plan of PLANS) {
    if (plan.id === "enterprise") continue;
    const fits =
      plan.maxActiveEmployees !== null &&
      plan.maxDepartments !== null &&
      plan.maxManagers !== null &&
      input.employees <= plan.maxActiveEmployees &&
      input.departments <= plan.maxDepartments &&
      managers <= plan.maxManagers &&
      input.branches <= (plan.maxBranches ?? 1);
    if (fits) return plan.id;
  }

  return "enterprise";
}

// "₪179 לחודש" / "לפי הצעה מותאמת" — used by the recommendation card and pricing page.
export function formatMonthlyPrice(plan: Plan): string {
  return plan.monthlyIls === null ? "לפי הצעה מותאמת" : `₪${plan.monthlyIls} לחודש`;
}

// The per-month price a plan is billed at during the LAUNCH_OFFER window
// (first `LAUNCH_OFFER.months` invoices, monthly billing). `null` for the
// custom-quote plan, which the offer does not apply to.
export function launchOfferMonthlyIls(plan: Plan): number | null {
  if (plan.monthlyIls === null) return null;
  return Math.round((plan.monthlyIls * (100 - LAUNCH_OFFER.discountPercent)) / 100);
}

// "31 בדצמבר 2026" — for offer copy.
export function launchOfferEndLabel(): string {
  return new Date(`${LAUNCH_OFFER.endsOn}T00:00:00`).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
