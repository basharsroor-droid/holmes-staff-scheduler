import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, CreditCard, Lock, Sparkles } from "lucide-react";

import { SELF_SERVE_PLAN_IDS, parseCheckoutSelection, quoteInvoice, type BillingPeriod } from "@/lib/billing";
import { LAUNCH_OFFER, getPlan, type PlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The checkout page, ready before a payment provider is (docs/BILLING_FOUNDATION.md).
// Plan and billing period are links (?plan=&period=), so there is no form state;
// the order summary comes from quoteInvoice (lib/billing.ts), which owns
// ShiftPilot's pricing rules. The pay button stays disabled until a
// BillingGateway adapter exists: at that point it calls
// gateway.createCheckout({ organizationId, planId, period, customerEmail }) from a
// server action and redirects to the provider's hosted page. Card details are
// only ever entered with the provider -- ShiftPilot never stores a card number.

const PERIOD_LABELS: Record<BillingPeriod, string> = { monthly: "חודשי", annual: "שנתי" };

function ils(amount: number | null) {
  return amount === null ? "הצעה מותאמת" : `₪${amount.toLocaleString("he-IL")}`;
}

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: string | string[]; period?: string | string[] }>;
}) {
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

  const [{ data: organization }, { data: usage }, params] = await Promise.all([
    supabase.from("organizations").select("name, created_at").eq("id", membership.organization_id).single(),
    supabase.from("organization_usage").select("*").eq("organization_id", membership.organization_id).maybeSingle(),
    searchParams
  ]);
  if (!organization) redirect("/workspace");

  const { planId, period } = parseCheckoutSelection(
    typeof params.plan === "string" ? params.plan : undefined,
    typeof params.period === "string" ? params.period : undefined,
    usage?.plan_id
  );
  const plan = getPlan(planId);
  const first = quoteInvoice({ planId, period, paidInvoiceNumber: 1, workspaceCreatedAt: organization.created_at });
  const afterOffer = quoteInvoice({
    planId,
    period,
    paidInvoiceNumber: LAUNCH_OFFER.months + 1,
    workspaceCreatedAt: organization.created_at
  });

  // Moving to a smaller plan: every quota the workspace already exceeds.
  const overQuota = usage
    ? [
        { label: "עובדים פעילים", used: Number(usage.active_employees ?? 0), max: plan.maxActiveEmployees },
        { label: "מנהלים", used: Number(usage.active_managers ?? 0), max: plan.maxManagers },
        { label: "סניפים", used: Number(usage.active_branches ?? 0), max: plan.maxBranches },
        { label: "מחלקות", used: Number(usage.active_departments ?? 0), max: plan.maxDepartments }
      ].filter((row) => row.max !== null && row.used > row.max)
    : [];

  const hrefFor = (nextPlan: PlanId, nextPeriod: BillingPeriod) =>
    `/workspace/subscription/checkout?plan=${nextPlan}&period=${nextPeriod}`;

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace/subscription" className="back-link">
            <ArrowRight size={17} /> חזרה למנוי שלי
          </Link>
          <p className="eyebrow">{organization.name}</p>
          <h1>
            <CreditCard /> בחירת מסלול ותשלום
          </h1>
          <p>בוחרים מסלול ומחזור חיוב ורואים בדיוק כמה ישולם ומתי · המחירים לפני מע״מ</p>
        </div>
      </header>

      <section className="template-list-card" aria-labelledby="checkout-plan-title">
        <div className="template-list-heading">
          <div>
            <p className="eyebrow">שלב 1</p>
            <h2 id="checkout-plan-title">מסלול</h2>
          </div>
        </div>
        <div className="actions" role="group" aria-label="בחירת מסלול">
          {SELF_SERVE_PLAN_IDS.map((id) => {
            const option = getPlan(id);
            const selected = id === planId;
            return (
              <Link
                className={`button ${selected ? "primary" : ""}`}
                aria-current={selected ? "true" : undefined}
                href={hrefFor(id, period)}
                key={id}
              >
                {selected ? <Check size={16} /> : null} {option.name} · {ils(option.monthlyIls)} לחודש
              </Link>
            );
          })}
        </div>
        <p className="card-muted" style={{ marginTop: 10 }}>
          {plan.tagline} · צריכים יותר מ-{getPlan("network").maxBranches} סניפים או התאמה מיוחדת?{" "}
          <Link href="/workspace/support">בקשת הצעה מותאמת</Link>
        </p>
      </section>

      <section className="template-list-card" aria-labelledby="checkout-period-title">
        <div className="template-list-heading">
          <div>
            <p className="eyebrow">שלב 2</p>
            <h2 id="checkout-period-title">מחזור חיוב</h2>
          </div>
        </div>
        <div className="actions" role="group" aria-label="בחירת מחזור חיוב">
          {(["monthly", "annual"] as const).map((option) => (
            <Link
              className={`button ${option === period ? "primary" : ""}`}
              aria-current={option === period ? "true" : undefined}
              href={hrefFor(planId, option)}
              key={option}
            >
              {option === period ? <Check size={16} /> : null} {PERIOD_LABELS[option]}
              {option === "annual" ? " · חודשיים במתנה" : ""}
            </Link>
          ))}
        </div>
      </section>

      {overQuota.length ? (
        <section className="template-list-card">
          <div className="submission-banner">
            <div>
              <strong>העסק כבר חורג מהמכסות של מסלול {plan.name}</strong>
              <span>
                {overQuota.map((row) => `${row.label}: ${row.used} מתוך ${row.max}`).join(" · ")} — כדי לעבור למסלול הזה
                צריך קודם לצמצם, או לבחור מסלול גדול יותר
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="template-list-card" aria-labelledby="checkout-summary-title">
        <div className="template-list-heading">
          <div>
            <p className="eyebrow">שלב 3</p>
            <h2 id="checkout-summary-title">סיכום</h2>
          </div>
        </div>
        <div className="template-list">
          <article className="card">
            <div className="mini-row">
              <span>
                <strong>
                  {plan.name} · חיוב {PERIOD_LABELS[period]}
                </strong>
                <small>מחיר מחירון: {ils(first.listAmountIls)} לפני מע״מ</small>
              </span>
            </div>
          </article>
          {first.launchOfferApplied ? (
            <article className="card">
              <div className="mini-row">
                <Sparkles size={17} aria-hidden="true" />
                <span>
                  <strong>
                    מבצע השקה: {first.discountPercent}% הנחה על {LAUNCH_OFFER.months} החיובים החודשיים הראשונים
                  </strong>
                  <small>
                    {ils(first.amountIls)} ב-{LAUNCH_OFFER.months} החיובים הראשונים, ואחר כך {ils(afterOffer.amountIls)}{" "}
                    לחודש
                  </small>
                </span>
              </div>
            </article>
          ) : null}
          <article className="card">
            <div className="mini-row">
              <span>
                <strong>לתשלום בחיוב הראשון: {ils(first.amountIls)}</strong>
                <small>
                  {period === "annual" ? "פעם בשנה" : "פעם בחודש"},{" "}
                  {usage?.subscription_status === "trialing" ? "החל מסיום תקופת הניסיון" : "החל מתקופת החיוב הבאה"} ·
                  לפני מע״מ · פרטי החיוב יישלחו ל־{user.email}
                </small>
              </span>
            </div>
          </article>
        </div>

        <div className="submission-banner" style={{ marginTop: 14 }}>
          <Lock size={18} aria-hidden="true" />
          <div>
            <strong>התשלום המקוון יופעל בקרוב</strong>
            <span>
              פרטי הכרטיס יוזנו רק אצל חברת הסליקה — ShiftPilot לא שומרת מספר כרטיס, ועד אז מעבר מסלול נעשה{" "}
              <Link href="/workspace/support">מול הצוות שלנו</Link>
            </span>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="button primary" disabled aria-disabled="true">
            <Lock size={16} /> מעבר לתשלום
          </button>
          <Link className="button" href="/pricing">
            השוואת מסלולים מלאה
          </Link>
        </div>
      </section>
    </main>
  );
}
