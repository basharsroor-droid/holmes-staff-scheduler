"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Lock, Unlock } from "lucide-react";

import { SUBMISSION_ACCESS_KEY } from "@/lib/local-storage-keys";
import {
  getSubmissionWindowLabel,
  resolveSubmissionAccess,
  type SubmissionAccessMode
} from "@/lib/submission-window";

const modeLabels: Record<SubmissionAccessMode, string> = {
  auto: "אוטומטי לפי 22-28 לחודש",
  open: "פתוח ידנית",
  closed: "סגור ידנית"
};

export function SubmissionAccessControl() {
  const [mode, setMode] = useState<SubmissionAccessMode>("auto");

  useEffect(() => {
    const stored = window.localStorage.getItem(SUBMISSION_ACCESS_KEY);
    if (stored === "open" || stored === "closed" || stored === "auto") {
      setMode(stored);
    }
  }, []);

  function updateMode(nextMode: SubmissionAccessMode) {
    setMode(nextMode);
    window.localStorage.setItem(SUBMISSION_ACCESS_KEY, nextMode);
    window.dispatchEvent(new Event("scheduler-submission-access-changed"));
  }

  const isOpen = resolveSubmissionAccess(mode);

  return (
    <section className="card access-control-card">
      <div>
        <div className="shift-title">
          <span className={isOpen ? "badge success" : "badge critical"}>
            {isOpen ? "הגשת משמרות פתוחה" : "הגשת משמרות סגורה"}
          </span>
          <CalendarClock size={20} color="var(--primary)" />
        </div>
        <h2>גישה להגשת סידור</h2>
        <p className="lead">
          ברירת המחדל: פתוח בכל חודש בין {getSubmissionWindowLabel()}, וסגור בשאר
          הימים. מנהל/ת יכולים לפתוח או לסגור ידנית במקרה מיוחד.
        </p>
      </div>

      <div className="access-mode-grid">
        <button
          className={`status-button ${mode === "auto" ? "active" : ""}`}
          onClick={() => updateMode("auto")}
        >
          אוטומטי
        </button>
        <button
          className={`status-button ${mode === "open" ? "active" : ""}`}
          onClick={() => updateMode("open")}
        >
          <Unlock size={16} />
          פתח
        </button>
        <button
          className={`status-button ${mode === "closed" ? "active" : ""}`}
          onClick={() => updateMode("closed")}
        >
          <Lock size={16} />
          סגור
        </button>
      </div>

      <div className="card-muted">
        מצב נוכחי: <strong>{modeLabels[mode]}</strong>
      </div>
    </section>
  );
}
