import Link from "next/link";

import { SETUP_STEPS, type SetupStepKey } from "@/lib/setup-steps";

// I1 (docs/REMEDIATION_PLAN.md): in-step guidance for the three pilot setup
// screens. Shown at the top of a screen until that step is done, then it
// disappears on its own. The copy lives in lib/setup-steps.ts, the same source
// as the /workspace checklist, so the two never drift apart.
export function SetupStepGuide({ step, complete }: { step: SetupStepKey; complete: boolean }) {
  if (complete) return null;
  const index = SETUP_STEPS.findIndex((item) => item.key === step);
  const current = SETUP_STEPS[index];
  if (!current) return null;

  return (
    <section className="pilot-readiness setup-step-guide" aria-labelledby={`setup-guide-${step}`}>
      <div className="pilot-readiness-head">
        <div>
          <p className="eyebrow">
            שלב {index + 1} מתוך {SETUP_STEPS.length} בהכנת הפיילוט
          </p>
          <h2 id={`setup-guide-${step}`}>{current.title}</h2>
          <p>{current.description}</p>
        </div>
      </div>
      <ol className="setup-step-howto">
        {current.howTo.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      <Link className="pricing-text-link" href="/workspace">
        לכל שלבי ההכנה
      </Link>
    </section>
  );
}
