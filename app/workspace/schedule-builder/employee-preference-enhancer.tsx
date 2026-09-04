"use client";

import { useEffect } from "react";
import { Heart, ShieldAlert, UserCheck, UserRoundX } from "lucide-react";

const rankByLabel: Record<string, number> = {
  "מועדפת": 0,
  "זמין/ה": 1,
  "רק אם צריך": 2,
  "לא הוגשה זמינות": 3,
  "לא זמין/ה": 4,
  "בחופשה": 5,
  "במחלה": 5
};

function preferenceLabel(button: HTMLButtonElement) {
  return button.querySelector("small")?.textContent?.trim() ?? "";
}

function enhanceGrid(grid: Element) {
  const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>("button.schedule-worker"));
  for (const button of buttons) {
    const label = preferenceLabel(button);
    const rank = rankByLabel[label] ?? 3;
    button.style.order = String(rank);
    button.dataset.preference = label === "מועדפת"
      ? "preferred"
      : label === "זמין/ה"
        ? "available"
        : label === "רק אם צריך"
          ? "fallback"
          : label === "לא זמין/ה"
            ? "unavailable"
            : label === "בחופשה" || label === "במחלה"
              ? "leave"
              : "unknown";
  }
}

function enhanceAll() {
  document.querySelectorAll(".schedule-worker-grid").forEach(enhanceGrid);
}

export function EmployeePreferenceEnhancer() {
  useEffect(() => {
    enhanceAll();

    const observer = new MutationObserver(() => enhanceAll());
    const board = document.querySelector(".schedule-board");
    if (board) observer.observe(board, { childList: true, subtree: true });

    function guardFallback(event: MouseEvent) {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>("button.schedule-worker");
      if (!button || preferenceLabel(button) !== "רק אם צריך" || button.disabled || button.getAttribute("aria-pressed") === "true") return;

      const grid = button.closest(".schedule-worker-grid");
      if (!grid) return;

      const strongerCandidateExists = Array.from(grid.querySelectorAll<HTMLButtonElement>("button.schedule-worker"))
        .some((candidate) => candidate !== button
          && !candidate.disabled
          && candidate.getAttribute("aria-pressed") !== "true"
          && ["מועדפת", "זמין/ה"].includes(preferenceLabel(candidate)));

      if (!strongerCandidateExists) return;

      if (!window.confirm("העובד/ת סימן/ה ‘רק אם צריך’, ועדיין יש למשמרת עובד/ת מועדף/ת או זמין/ה. לשבץ בכל זאת?")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }

    document.addEventListener("click", guardFallback, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", guardFallback, true);
    };
  }, []);

  return <>
    <section className="preference-decision-guide" aria-label="סדר עדיפויות לשיבוץ">
      <div>
        <p className="eyebrow">Employee Preferences</p>
        <h2>סדר עדיפויות חכם לשיבוץ</h2>
        <p>בכל משמרת העובדים מסודרים אוטומטית לפי ההעדפה שהם הגישו. ההחלטה נשארת תמיד אצל המנהל.</p>
      </div>
      <div className="preference-decision-items">
        <span><Heart size={16} /> <b>מועדפת</b><small>בחירה ראשונה</small></span>
        <span><UserCheck size={16} /> <b>זמין/ה</b><small>מתאים לשיבוץ</small></span>
        <span><ShieldAlert size={16} /> <b>רק אם צריך</b><small>גיבוי בלבד</small></span>
        <span><UserRoundX size={16} /> <b>לא זמין/ה</b><small>חסום לשיבוץ</small></span>
      </div>
    </section>

    <style jsx global>{`
      .preference-decision-guide {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
        gap: 18px;
        align-items: center;
        margin: 0 0 20px;
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--surface);
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.05);
      }
      .preference-decision-guide h2 { margin: 2px 0 6px; font-size: 1.1rem; }
      .preference-decision-guide p { margin: 0; color: var(--muted); }
      .preference-decision-items { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .preference-decision-items span { display: grid; grid-template-columns: auto 1fr; gap: 2px 7px; align-items: center; border: 1px solid var(--line); border-radius: 14px; padding: 10px; background: var(--background); }
      .preference-decision-items small { grid-column: 2; color: var(--muted); }
      .schedule-worker-grid { display: flex !important; flex-wrap: wrap; }
      .schedule-worker[data-preference="preferred"] { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary) 42%, transparent); }
      .schedule-worker[data-preference="preferred"] small::before { content: "♥ "; }
      .schedule-worker[data-preference="fallback"] { opacity: 0.82; border-style: dashed; }
      .schedule-worker[data-preference="unavailable"], .schedule-worker[data-preference="leave"] { opacity: 0.55; }
      @media (max-width: 760px) {
        .preference-decision-guide { grid-template-columns: 1fr; }
        .preference-decision-items { grid-template-columns: 1fr 1fr; }
      }
      @media (max-width: 460px) {
        .preference-decision-items { grid-template-columns: 1fr; }
      }
    `}</style>
  </>;
}
