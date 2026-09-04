"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from "lucide-react";

type CoverageWorker = {
  user_id: string;
  seniority_level: string;
  profile: { first_name: string; last_name: string } | null;
};

type CoverageTemplate = {
  name: string;
  requires_senior_employee: boolean;
};

type CoverageIssue = {
  key: string;
  shiftLabel: string;
  missingEmployees: number;
  missingSenior: boolean;
};

function normalizedName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isSenior(level: string) {
  const value = level.toLowerCase();
  return value === "senior" || value === "lead" || value === "manager" || value.includes("senior");
}

export function CoverageRulesEnhancer({ workers, templates }: { workers: CoverageWorker[]; templates: CoverageTemplate[] }) {
  const [issues, setIssues] = useState<CoverageIssue[]>([]);

  const seniorNames = useMemo(() => new Set(
    workers
      .filter((worker) => isSenior(worker.seniority_level))
      .map((worker) => worker.profile ? normalizedName(`${worker.profile.first_name} ${worker.profile.last_name}`) : "")
      .filter(Boolean)
  ), [workers]);

  const seniorRequiredNames = useMemo(() => new Set(
    templates.filter((template) => template.requires_senior_employee).map((template) => normalizedName(template.name))
  ), [templates]);

  useEffect(() => {
    function calculate() {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".schedule-shift-card"));
      const next: CoverageIssue[] = [];

      cards.forEach((card, index) => {
        const title = card.querySelector<HTMLElement>(".shift-title > span")?.textContent ?? `משמרת ${index + 1}`;
        const meta = card.querySelector<HTMLElement>(".shift-title > small")?.textContent ?? "";
        const match = meta.match(/(\d+)\s*\/\s*(\d+)/);
        const assigned = match ? Number(match[1]) : 0;
        const required = match ? Number(match[2]) : 0;
        const selectedWorkers = Array.from(card.querySelectorAll<HTMLButtonElement>("button.schedule-worker[aria-pressed='true']"));
        const hasSenior = selectedWorkers.some((button) => {
          const name = normalizedName(button.querySelector("span")?.textContent ?? "");
          return seniorNames.has(name);
        });
        const requiresSenior = seniorRequiredNames.has(normalizedName(title));
        const missingEmployees = Math.max(0, required - assigned);
        const missingSenior = requiresSenior && !hasSenior;

        if (missingEmployees || missingSenior) {
          next.push({
            key: `${index}-${title}`,
            shiftLabel: `${title} · ${meta.split("·")[0]?.trim() ?? ""}`.trim(),
            missingEmployees,
            missingSenior
          });
        }
      });

      setIssues(next);
    }

    calculate();
    const board = document.querySelector(".schedule-workbench") ?? document.body;
    const observer = new MutationObserver(calculate);
    observer.observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed", "class"] });

    function guardPublish(event: MouseEvent) {
      const button = (event.target as HTMLElement | null)?.closest("button");
      if (!button || !/פרסום הסידור/.test(button.textContent ?? "")) return;
      calculate();

      const cardsNow = Array.from(document.querySelectorAll<HTMLElement>(".schedule-shift-card"));
      let missingStaff = 0;
      let missingSenior = 0;
      cardsNow.forEach((card) => {
        const title = normalizedName(card.querySelector<HTMLElement>(".shift-title > span")?.textContent ?? "");
        const meta = card.querySelector<HTMLElement>(".shift-title > small")?.textContent ?? "";
        const match = meta.match(/(\d+)\s*\/\s*(\d+)/);
        if (match && Number(match[1]) < Number(match[2])) missingStaff += 1;
        if (seniorRequiredNames.has(title)) {
          const selectedWorkers = Array.from(card.querySelectorAll<HTMLButtonElement>("button.schedule-worker[aria-pressed='true']"));
          const hasSenior = selectedWorkers.some((workerButton) => seniorNames.has(normalizedName(workerButton.querySelector("span")?.textContent ?? "")));
          if (!hasSenior) missingSenior += 1;
        }
      });

      if (!missingSenior) return;
      const message = [
        missingStaff ? `חסר כוח אדם ב-${missingStaff} משמרות` : null,
        missingSenior ? `חסר עובד/ת senior ב-${missingSenior} משמרות שמחייבות זאת` : null
      ].filter(Boolean).join("\n");
      if (!window.confirm(`${message}.\n\nאלה חריגי Coverage Rules. לפרסם בכל זאת?`)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }

    document.addEventListener("click", guardPublish, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", guardPublish, true);
    };
  }, [seniorNames, seniorRequiredNames]);

  const missingStaffCount = issues.filter((issue) => issue.missingEmployees > 0).length;
  const missingSeniorCount = issues.filter((issue) => issue.missingSenior).length;

  return <section className={`coverage-rules-panel ${issues.length ? "has-issues" : "all-clear"}`} aria-live="polite">
    <div className="coverage-rules-head">
      <div>
        <p className="eyebrow">Coverage Rules</p>
        <h2>{issues.length ? <><ShieldAlert size={20} /> חריגי כיסוי לפני פרסום</> : <><CheckCircle2 size={20} /> הכיסוי תקין</>}</h2>
        <p>{issues.length ? "ShiftPilot מציג רק את החריגים שדורשים החלטת מנהל לפני פרסום." : "כל המשמרות עומדות כרגע בדרישות כוח האדם וה-senior שהוגדרו."}</p>
      </div>
      <div className="coverage-rules-summary">
        <span><Users size={16} /><strong>{missingStaffCount}</strong><small>חוסר בכוח אדם</small></span>
        <span><AlertTriangle size={16} /><strong>{missingSeniorCount}</strong><small>חוסר senior</small></span>
      </div>
    </div>
    {issues.length ? <div className="coverage-rules-list">
      {issues.slice(0, 8).map((issue) => <article key={issue.key}>
        <strong>{issue.shiftLabel}</strong>
        <span>{issue.missingEmployees ? `חסרים ${issue.missingEmployees} עובד/ים` : "כמות עובדים תקינה"}{issue.missingSenior ? " · נדרש senior" : ""}</span>
      </article>)}
      {issues.length > 8 ? <small>ועוד {issues.length - 8} חריגים בסידור.</small> : null}
    </div> : null}
    <style jsx global>{`
      .coverage-rules-panel{margin:18px 0;padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}
      .coverage-rules-panel.has-issues{border-style:dashed}
      .coverage-rules-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
      .coverage-rules-head h2{display:flex;gap:8px;align-items:center;margin:4px 0 6px}
      .coverage-rules-head p{margin:0}
      .coverage-rules-summary{display:flex;gap:10px;flex-wrap:wrap}
      .coverage-rules-summary span{min-width:120px;padding:10px 12px;border:1px solid var(--border);border-radius:14px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:center}
      .coverage-rules-summary small{grid-column:1 / -1}
      .coverage-rules-list{display:grid;gap:8px;margin-top:14px}
      .coverage-rules-list article{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;background:var(--surface-muted)}
      .coverage-rules-list span{font-size:.9rem}
      @media(max-width:760px){.coverage-rules-head{flex-direction:column}.coverage-rules-summary{width:100%}.coverage-rules-summary span{flex:1}.coverage-rules-list article{flex-direction:column;gap:4px}}
    `}</style>
  </section>;
}
