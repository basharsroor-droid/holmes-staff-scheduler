import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";

import { isLaunchOfferEligible } from "@/lib/billing";
import { LAUNCH_OFFER, PLANS } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// J2 (docs/REMEDIATION_PLAN.md), the part that doesn't need a payment
// provider: a read-only view of the plan, the trial and usage against every
// quota. Upgrading, downgrading and cancelling in-app come with the provider
// (see docs/BILLING_FOUNDATION.md); until then plan changes go through support.

const STATUS_LABELS: Record<string, string> = {
  trialing: "תקופת ניסיון",
  active: "פעיל",
  past_due: "התשלום נכשל",
  grace_period: "תקופת חסד",
  read_only: "צפייה בלבד",
  canceled: "בוטל",
  suspended: "מושהה"
};

type QuotaRow = { label: string; used: number; max: number | null; note?: string };

function daysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
}

export default async function SubscriptionPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) redirect("/workspace");

  const [{ data: organization }, { data: usage }] = await Promise.all([
    supabase.from("organizations").select("name, created_at").eq("id", membership.organization_id).single(),
    supabase.from("organization_usage").select("*").eq("organization_id", membership.organization_id).maybeSingle()
  ]);
  if (!organization) redirect("/workspace");

  const plan = PLANS.find((item) => item.id === usage?.plan_id);
  const status = usage?.subscription_status ?? null;
  const trialDays = status === "trialing" ? daysLeft(usage?.trial_ends_at ?? null) : null;
  const launchOffer = !!plan?.monthlyIls && isLaunchOfferEligible(organization.created_at, "monthly");

  const pendingInvitations = Number(usage?.pending_invitations ?? 0);
  const quotas: QuotaRow[] = usage
    ? [
        {
          label: "עובדים פעילים",
          used: Number(usage.active_employees ?? 0),
          max: usage.max_active_employees,
          note: pendingInvitations ? `ועוד ${pendingInvitations} הזמנות ממתינות, שגם הן נספרות במכסה` : undefined
        },
        { label: "מנהלים", used: Number(usage.active_managers ?? 0), max: usage.max_managers },
        { label: "סניפים", used: Number(usage.active_branches ?? 0), max: usage.max_branches },
        { label: "מחלקות", used: Number(usage.active_departments ?? 0), max: usage.max_departments }
      ]
    : [];

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link">
            <ArrowRight size={17} /> חזרה לסביבת העסק
          </Link>
          <p className="eyebrow">{organization.name}</p>
          <h1>
            <CreditCard /> המנוי שלי
          </h1>
          <p>המסלול, תקופת הניסיון והשימוש מול המכסות של העסק</p>
        </div>
      </header>

      {!usage || !usage.plan_id ? (
        <section className="template-list-card">
          <div className="submission-banner">
            <div>
              <strong>לא נמצא מנוי לעסק</strong>
              <span>
                נראה שהמנוי עדיין לא הוגדר — <Link href="/workspace/support">פנו לתמיכה</Link> ונסדר את זה
              </span>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="workspace-stats schedule-stats" aria-label="פרטי המנוי">
            <article>
              <CreditCard />
              <span>
                <strong>{plan?.name ?? usage.plan_id}</strong>
                <small>המסלול הנוכחי</small>
              </span>
            </article>
            <article>
              <span>
                <strong>{status ? (STATUS_LABELS[status] ?? status) : "—"}</strong>
                <small>
                  {trialDays === null
                    ? "סטטוס המנוי"
                    : trialDays <= 0
                      ? "תקופת הניסיון הסתיימה"
                      : trialDays === 1
                        ? "נותר יום ניסיון אחרון"
                        : `נותרו ${trialDays} ימי ניסיון`}
                </small>
              </span>
            </article>
            <article>
              <span>
                <strong>
                  {plan?.monthlyIls
                    ? `${plan.monthlyIls} ₪ לחודש`
                    : plan?.customFromIls
                      ? `מ-${plan.customFromIls} ₪`
                      : "הצעה מותאמת"}
                </strong>
                <small>{plan?.annualIls ? `או ${plan.annualIls} ₪ לשנה · לפני מע״מ` : "לפני מע״מ"}</small>
              </span>
            </article>
          </section>

          {launchOffer ? (
            <section className="template-list-card">
              <div className="submission-banner open">
                <div>
                  <strong>
                    מבצע השקה: {LAUNCH_OFFER.discountPercent}% הנחה על {LAUNCH_OFFER.months} החיובים החודשיים הראשונים
                  </strong>
                  <span>העסק שלכם זכאי למבצע כי נפתח עד {LAUNCH_OFFER.endsOn.split("-").reverse().join(".")}</span>
                </div>
              </div>
            </section>
          ) : null}

          <section className="template-list-card" aria-labelledby="usage-title">
            <div className="template-list-heading">
              <div>
                <p className="eyebrow">שימוש מול מכסה</p>
                <h2 id="usage-title">מה נכלל במסלול</h2>
              </div>
            </div>
            <div className="template-list">
              {quotas.map((row) => {
                const percent = row.max ? Math.min(100, Math.round((row.used / row.max) * 100)) : 0;
                return (
                  <article className="card" key={row.label}>
                    <div className="mini-row">
                      <span>
                        <strong>{row.label}</strong>
                        <small>
                          {row.max === null ? `${row.used} · ללא הגבלה` : `${row.used} מתוך ${row.max}`}
                          {row.note ? ` · ${row.note}` : ""}
                        </small>
                      </span>
                      {row.max !== null && row.used >= row.max ? (
                        <span className="badge warning">המכסה מלאה</span>
                      ) : null}
                    </div>
                    {row.max !== null ? (
                      <div className="pilot-progress-track" aria-hidden="true">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="template-list-card">
            <div className="template-list-heading">
              <div>
                <p className="eyebrow">שינוי מסלול</p>
                <h2>צריכים מסלול אחר?</h2>
                <p className="card-muted">
                  תשלום ושינוי מסלול מתוך המערכת יופעלו בקרוב, ועד אז שינוי מסלול נעשה מול הצוות שלנו — בלי לאבד נתונים
                </p>
              </div>
            </div>
            <div className="actions">
              <Link className="button primary" href="/workspace/subscription/checkout">
                בחירת מסלול ותשלום
              </Link>
              <Link className="button" href="/pricing">
                השוואת מסלולים
              </Link>
              <Link className="button" href="/workspace/support">
                פנייה לשינוי מסלול
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
