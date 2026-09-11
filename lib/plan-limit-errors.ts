// Maps the database's plan-limit errors (J3, migration 20260911100000) to
// Hebrew messages. The triggers raise 'plan_limit:<resource>'; Supabase returns
// that as error.message.
//
// No imports on purpose: tests/unit loads this file directly with Node's
// type stripping, which cannot resolve the "@/" alias.

export type PlanLimitResource = "employee" | "manager" | "branch" | "department";

const MESSAGES: Record<PlanLimitResource, string> = {
  employee: "הגעתם למספר העובדים הפעילים שהמסלול שלכם כולל (כולל הזמנות שממתינות). כדי להוסיף עובדים צריך מסלול גדול יותר.",
  manager: "הגעתם למספר המנהלים שהמסלול שלכם כולל (כולל הזמנות שממתינות). כדי להוסיף מנהלים צריך מסלול גדול יותר.",
  branch: "הגעתם למספר הסניפים שהמסלול שלכם כולל. כדי לפתוח סניף נוסף צריך מסלול גדול יותר.",
  department: "הגעתם למספר המחלקות שהמסלול שלכם כולל. כדי להוסיף מחלקה צריך מסלול גדול יותר."
};

/** The plan resource a Supabase error refers to, or null if it isn't a plan-limit error. */
export function planLimitResource(error: { message?: string } | null | undefined): PlanLimitResource | null {
  const match = /plan_limit:(employee|manager|branch|department)\b/.exec(error?.message ?? "");
  return match ? (match[1] as PlanLimitResource) : null;
}

/** A Hebrew explanation for a plan-limit error, or null for any other error. */
export function planLimitMessage(error: { message?: string } | null | undefined): string | null {
  const resource = planLimitResource(error);
  return resource ? MESSAGES[resource] : null;
}
