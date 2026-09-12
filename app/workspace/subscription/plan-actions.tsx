"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Check, CreditCard, Loader2, RotateCcw, XCircle } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getPlan, type PlanId } from "@/lib/plans";
import {
  planChangeKind,
  quotaViolations,
  selfServePlans,
  subscriptionErrorMessage,
  type UsageSnapshot
} from "@/lib/subscription-changes";

// The owner-facing half of J2: switch plan, cancel, undo a cancellation.
// The database (migration 20260912090000) owns the rules; this screen only
// shows them before the click, so a refusal is never a surprise: a plan whose
// quotas the workspace already exceeds is disabled with the reason, and once
// billing starts the actions give way to a support link, because a paid change
// moves money and belongs to the payment provider.

type Props = {
  currentPlanId: string;
  currentPeriod: string;
  status: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  isOwner: boolean;
  usage: UsageSnapshot;
};

const PERIOD_LABELS: Record<string, string> = { monthly: "חודשי", annual: "שנתי" };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("he-IL") : null;
}

export function PlanActions({
  currentPlanId,
  currentPeriod,
  status,
  trialEndsAt,
  cancelAtPeriodEnd,
  isOwner,
  usage
}: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { message, kind, setMessage } = useStatusMessage();
  const [busy, setBusy] = useState<string | null>(null);
  const trialing = status === "trialing";
  const trialEndLabel = formatDate(trialEndsAt);

  // supabase.rpc() returns a thenable query builder, not a Promise.
  async function run(
    label: string,
    action: () => PromiseLike<{ error: { message?: string } | null }>,
    success: string
  ) {
    setBusy(label);
    const { error } = await action();
    setBusy(null);
    if (error) {
      setMessage(subscriptionErrorMessage(error) ?? "לא הצלחנו לעדכן את המנוי — אפשר לנסות שוב", "error");
      return;
    }
    setMessage(success);
    router.refresh();
  }

  const changePlan = (planId: PlanId, period: string) =>
    run(
      `plan:${planId}:${period}`,
      () => supabase.rpc("change_subscription_plan", { target_plan_id: planId, target_period: period }),
      `המסלול עודכן ל${getPlan(planId).name}`
    );

  if (!isOwner) {
    return (
      <p className="card-muted">
        רק בעל העסק יכול לשנות מסלול או לבטל מנוי — <Link href="/workspace/support">אפשר לפנות אלינו</Link> ונעזור
      </p>
    );
  }

  if (!trialing) {
    return (
      <>
        <p className="card-muted">
          {cancelAtPeriodEnd
            ? "המנוי מסומן לביטול בסוף תקופת החיוב הנוכחית"
            : "שינוי מסלול וביטול אחרי תחילת החיוב נעשים מול הצוות שלנו, עד שתחובר מערכת התשלומים"}
        </p>
        <div className="actions">
          <Link className="button primary" href="/workspace/support">
            פנייה לשינוי מסלול
          </Link>
          <Link className="button" href="/pricing">
            השוואת מסלולים
          </Link>
        </div>
        <StatusMessage message={message} kind={kind} />
      </>
    );
  }

  return (
    <>
      <p className="card-muted">
        בתקופת הניסיון אפשר להחליף מסלול מיד ובלי תשלום
        {trialEndLabel ? `, והמסלול שייבחר הוא זה שיתחיל להיות מחויב ב-${trialEndLabel}` : ""}
      </p>

      <div className="template-list">
        {selfServePlans().map((plan) => {
          const violations = quotaViolations(plan, usage);
          const isCurrent = plan.id === currentPlanId;
          const kindLabel = isCurrent
            ? "המסלול הנוכחי"
            : planChangeKind(currentPlanId as PlanId, plan.id) === "upgrade"
              ? "שדרוג"
              : "הורדה";
          return (
            <article className="card" key={plan.id}>
              <div className="mini-row">
                <span>
                  <strong>
                    {plan.name} · ₪{plan.monthlyIls} לחודש
                  </strong>
                  <small>
                    {plan.tagline}
                    {violations.length
                      ? ` · ${violations.map((row) => `${row.label}: ${row.used} מתוך ${row.max}`).join(" · ")}`
                      : ""}
                  </small>
                </span>
                <span className={`badge ${isCurrent ? "opening" : ""}`}>{kindLabel}</span>
              </div>
              {isCurrent ? null : (
                <div className="actions">
                  <button
                    type="button"
                    className="button primary"
                    disabled={!!busy || violations.length > 0}
                    onClick={() => void changePlan(plan.id, currentPeriod === "annual" ? "annual" : "monthly")}
                  >
                    {busy === `plan:${plan.id}:${currentPeriod === "annual" ? "annual" : "monthly"}` ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <CreditCard size={16} />
                    )}{" "}
                    מעבר למסלול הזה
                  </button>
                  {violations.length ? (
                    <span className="card-muted">כדי לעבור למסלול הזה צריך קודם לצמצם, או לבחור מסלול גדול יותר</span>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="template-list-heading" style={{ marginTop: 14 }}>
        <div>
          <p className="eyebrow">מחזור חיוב</p>
          <h3>איך תרצו להיות מחויבים כשהניסיון יסתיים</h3>
        </div>
      </div>
      <div className="actions" role="group" aria-label="בחירת מחזור חיוב">
        {(["monthly", "annual"] as const).map((period) => (
          <button
            key={period}
            type="button"
            className={`button ${currentPeriod === period ? "primary" : ""}`}
            aria-pressed={currentPeriod === period}
            disabled={!!busy || currentPeriod === period}
            onClick={() => void changePlan(currentPlanId as PlanId, period)}
          >
            {currentPeriod === period ? <Check size={16} /> : null} {PERIOD_LABELS[period]}
            {period === "annual" ? " · חודשיים במתנה" : ""}
          </button>
        ))}
      </div>

      <div className="actions" style={{ marginTop: 14 }}>
        {cancelAtPeriodEnd ? (
          <>
            <button
              type="button"
              className="button primary"
              disabled={!!busy}
              onClick={() =>
                void run("resume", () => supabase.rpc("resume_subscription"), "הביטול בוטל והמנוי ימשיך כרגיל")
              }
            >
              {busy === "resume" ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} />} ביטול הבקשה לסגירה
            </button>
            <span className="card-muted">
              {trialEndLabel
                ? `המנוי מסומן לסגירה ב-${trialEndLabel} — עד אז הכול ממשיך לעבוד, ואפשר לחזור בכל רגע`
                : "המנוי מסומן לסגירה בסוף התקופה הנוכחית"}
            </span>
          </>
        ) : (
          <>
            <button
              type="button"
              className="button"
              disabled={!!busy}
              onClick={() =>
                void run(
                  "cancel",
                  () => supabase.rpc("cancel_subscription"),
                  trialEndLabel ? `המנוי ייסגר ב-${trialEndLabel}, ועד אז אפשר להמשיך לעבוד` : "המנוי סומן לסגירה"
                )
              }
            >
              {busy === "cancel" ? <Loader2 className="spin" size={16} /> : <XCircle size={16} />} ביטול המנוי
            </button>
            <span className="card-muted">הביטול שומר את הנתונים, והעבודה ממשיכה עד סוף הניסיון</span>
          </>
        )}
      </div>

      <StatusMessage message={message} kind={kind} />
    </>
  );
}
