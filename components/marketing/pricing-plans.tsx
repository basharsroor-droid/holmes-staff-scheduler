"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

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

  return (
    <div className="pricing-block">
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
          שנתי · חודשיים במתנה
        </button>
      </div>

      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const isEnterprise = plan.monthlyIls === null;
          return (
            <div className={`pricing-card${plan.badge ? " featured" : ""}`} key={plan.id}>
              {plan.badge ? <span className="pricing-badge">{plan.badge}</span> : null}
              <div className="pricing-head">
                <h3>{plan.name}</h3>
                <p>{plan.tagline}</p>
              </div>
              {priceBlock(plan, cycle)}
              <p className="pricing-quota">{quotaLine(plan)}</p>
              <ul className="pricing-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {isEnterprise ? (
                <Link className="button" href="/support">
                  לקבלת הצעה מותאמת
                </Link>
              ) : (
                <Link className="button brand-button" href="/onboarding">
                  התחלת 30 ימי ניסיון <ArrowLeft size={16} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="pricing-fineprint">
        כל המחירים הם מחירי השקה, בשקלים ולפני מע״מ, ועשויים להשתנות. הניסיון הוא ל-30 יום, ללא כרטיס אשראי.
      </p>
    </div>
  );
}
