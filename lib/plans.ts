// Single source of truth for ShiftPilot's commercial plans, add-ons and the
// trial length. The public pricing page (app/pricing), the onboarding
// plan-recommendation step (app/onboarding) and the trial indicator all read
// from here.
//
// The `public.plans` table is seeded from these same numbers in the migration
// supabase/migrations/20260903_*_subscription_foundation.sql -- keep the two in
// sync. `npm run validate:schema` does NOT catch value drift between them.
//
// Prices are the launch prices ("מחיר השקה"), in ILS, before VAT. Source:
// the pricing review (Artifact add694c4) and the pricing model document
// "תמחור, ניסיון והקמת עסק" v1.0.

export const TRIAL_DAYS = 30;

// The plan every organization starts its trial on (business-tier quotas),
// per the pricing document §6.
export const DEFAULT_TRIAL_PLAN_ID = "business";

export type PlanId = "solo" | "business" | "business_pro" | "enterprise";

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
  /** Feature bullets shown on the pricing card. */
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "מנהל עצמאי",
    tagline: "למנהל צוות, אחראי משמרת או בעל עסק קטן.",
    monthlyIls: 59,
    annualIls: 590,
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
    tagline: "לעסק עם צוות אחד ועד שלוש מחלקות.",
    badge: "הפופולרי ביותר",
    monthlyIls: 129,
    annualIls: 1290,
    maxActiveEmployees: 30,
    maxDepartments: 3,
    maxManagers: 4,
    maxBranches: 1,
    features: [
      "עד 30 עובדים פעילים",
      "עד 3 מחלקות ועד 4 מנהלים",
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
    tagline: "לעסק גדול, מועדון, מסעדה, מלון או ארגון רב-צוותי.",
    monthlyIls: 259,
    annualIls: 2590,
    maxActiveEmployees: 80,
    maxDepartments: 8,
    maxManagers: 12,
    maxBranches: 1,
    features: [
      "עד 80 עובדים פעילים",
      "עד 8 מחלקות ועד 12 מנהלים",
      "ניהול מרכזי של כל המחלקות",
      "הרשאות מתקדמות",
      "דוחות ואנליטיקה",
      "יומן פעולות מלא (Audit Log)",
      "הכנה לאינטגרציות עתידיות"
    ]
  },
  {
    id: "enterprise",
    name: "רשת / Enterprise",
    tagline: "לעסק עם כמה סניפים, יותר מ-80 עובדים או דרישות מיוחדות.",
    monthlyIls: null,
    annualIls: null,
    maxActiveEmployees: null,
    maxDepartments: null,
    maxManagers: null,
    maxBranches: null,
    features: [
      "מספר סניפים ושיתוף עובדים ביניהם",
      "מחלקות, מנהלים ועובדים ללא מגבלת מכסה",
      "דוחות מרכזיים לכל הרשת",
      "הדרכה והטמעה אישית",
      "אינטגרציות ודרישות אבטחה ודיווח מותאמות",
      "הצעת מחיר מותאמת — החל מ-499 ₪ לחודש"
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
  { label: "הקמה והדרכה אישית", price: "299 ₪ חד-פעמי" },
  { label: "ייבוא עובדים והגדרות", price: "החל מ-199 ₪ חד-פעמי" },
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

// Returns the smallest plan whose every quota covers the input. Anything that
// needs more than one branch, more than 80 employees, or that no listed plan
// covers, lands on enterprise (custom quote).
export function recommendPlan(input: RecommendInput): PlanId {
  const managers = input.managers ?? 1;

  if (input.branches > 1) return "enterprise";

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

// "₪129 לחודש" / "לפי הצעה" — used by the recommendation card and pricing page.
export function formatMonthlyPrice(plan: Plan): string {
  return plan.monthlyIls === null ? "לפי הצעה מותאמת" : `₪${plan.monthlyIls} לחודש`;
}
