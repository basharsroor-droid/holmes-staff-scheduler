"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Check, Sparkles } from "lucide-react";

import { PLANS, type Plan } from "@/lib/plans";

type Cycle = "monthly" | "annual";

function priceBlock(plan: Plan, cycle: Cycle) {
  if (plan.monthlyIls === null || plan.annualIls === null) {
    return (
      <div className="pricing-price">
        <strong>החל מ-499 ₪</strong>
        <small>לחודש · הצעה מותאמת</small>
      </div>
    );
  }

  if (cycle === "annual") {
    const perMonth = Math.round(plan.annualIls / 12);
    return (
      <div className="pricing-price">
        <strong>₪{perMonth}</strong>
        <small>לחודש · בתשלום שנתי ₪{plan.annualIls} (חודשיים במתנה)</small>
      </div>
    );
  }

  return (
    <div className="pricing-price">
      <strong>₪{plan.monthlyIls}</strong>
      <small>לחודש · חיוב חודשי</small>
    </div>
  );
}

function quotaLine(plan: Plan) {
  if (plan.maxActiveEmployees === null) return "עובדים, מחלקות ומנהלים לפי התאמה";
  return `עד ${plan.maxActiveEmployees} עובדים · ${plan.maxDepartments} מחלקות · ${plan.maxManagers} מנהלים`;
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const standardPlans = PLANS.filter((plan) => plan.id !== "enterprise");
  const enterprisePlan = PLANS.find((plan) => plan.id === "enterprise");

  return (
    <div className="pricing-block">
      <div className="pricing-cycle-wrap">
        <span>בחרו את אופן החיוב</span>
        <div className="pricing-cycle" role="group" aria-label="מחזור חיוב">
          <button
            type="button"
            className={cycle === "monthly" ? "active" : ""}
            aria-pressed={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
          >
            חודשי
          </button>
          <button
            type="button"
            className={cycle === "annual" ? "active" : ""}
            aria-pressed={cycle === "annual"}
            onClick={() => setCycle("annual")}
          >
            שנתי <em>חודשיים במתנה</em>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {standardPlans.map((plan, index) => (
          <article className={`pricing-card${plan.badge ? " featured" : ""}`} key={plan.id}>
            {plan.badge ? <span className="pricing-badge"><Sparkles size={13} /> {plan.badge}</span> : null}
            <div className="pricing-head">
              <span className="pricing-plan-index" aria-hidden="true">0{index + 1}</span>
              <div><h3>{plan.name}</h3><p>{plan.tagline}</p></div>
            </div>
            {priceBlock(plan, cycle)}
            <p className="pricing-quota">{quotaLine(plan)}</p>
            <div className="pricing-includes">מה כלול במסלול</div>
            <ul className="pricing-features">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className="pricing-check"><Check size={14} aria-hidden="true" /></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link className={`button pricing-card-cta${plan.badge ? " brand-button" : ""}`} href="/onboarding">
              התחלת 30 ימי ניסיון <ArrowLeft size={16} />
            </Link>
          </article>
        ))}
      </div>

      {enterprisePlan ? (
        <article className="pricing-enterprise">
          <div className="pricing-enterprise-icon"><Building2 aria-hidden="true" /></div>
          <div className="pricing-enterprise-copy">
            <span>לעסקים בצמיחה ובריבוי סניפים</span>
            <h3>{enterprisePlan.name}</h3>
            <p>{enterprisePlan.tagline}</p>
          </div>
          <ul>
            {enterprisePlan.features.slice(0, 3).map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}
          </ul>
          <div className="pricing-enterprise-action">
            <strong>החל מ־499 ₪</strong>
            <small>לחודש · הצעה מותאמת</small>
            <Link className="button" href="/support">דברו איתנו <ArrowLeft size={16} /></Link>
          </div>
        </article>
      ) : null}

      <p className="pricing-fineprint">
        כל המחירים הם מחירי השקה, בשקלים ולפני מע״מ, ועשויים להשתנות. סידור שבועי, דו־שבועי, חודשי או מותאם כלול באותו מחיר. הניסיון הוא ל-30 יום, ללא כרטיס אשראי.
      </p>
    </div>
  );
}
