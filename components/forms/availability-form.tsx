"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarClock, Lock } from "lucide-react";

import { AvailabilityBadge } from "@/components/schedule/badges";
import { SUBMISSION_ACCESS_KEY } from "@/lib/local-storage-keys";
import {
  getSubmissionWindowLabel,
  resolveSubmissionAccess,
  type SubmissionAccessMode
} from "@/lib/submission-window";
import type { Availability, ShiftTemplate } from "@/types/scheduler";

export function AvailabilityForm({
  days,
  initialAvailability,
  employeeId,
  templates
}: {
  days: Date[];
  initialAvailability: Availability[];
  employeeId: string;
  templates: ShiftTemplate[];
}) {
  const mine = useMemo(
    () => initialAvailability.filter((entry) => entry.employeeId === employeeId),
    [employeeId, initialAvailability]
  );
  const [entries, setEntries] = useState(mine);
  const [saved, setSaved] = useState(false);
  const [accessMode, setAccessMode] = useState<SubmissionAccessMode>("auto");
  const allTemplateIds = templates.map((template) => template.id);
  const isSubmissionOpen = resolveSubmissionAccess(accessMode);
  const availableDays = entries.filter(
    (entry) => (entry.availableShiftTemplateIds?.length ?? 0) > 0
  ).length;
  const onlyIfNeededDays = entries.filter(
    (entry) => entry.status === "only_if_needed"
  ).length;

  useEffect(() => {
    function syncAccessMode() {
      const stored = window.localStorage.getItem(SUBMISSION_ACCESS_KEY);
      setAccessMode(
        stored === "open" || stored === "closed" || stored === "auto" ? stored : "auto"
      );
    }

    syncAccessMode();
    window.addEventListener("storage", syncAccessMode);
    window.addEventListener("scheduler-submission-access-changed", syncAccessMode);
    return () => {
      window.removeEventListener("storage", syncAccessMode);
      window.removeEventListener("scheduler-submission-access-changed", syncAccessMode);
    };
  }, []);

  function updateEntry(date: string, patch: Partial<Availability>) {
    if (!isSubmissionOpen) return;
    setSaved(false);
    setEntries((current) =>
      current.map((entry) => {
        if (entry.date !== date) return entry;
        const next = { ...entry, ...patch };
        const hasAvailability = (next.availableShiftTemplateIds?.length ?? 0) > 0;
        return {
          ...next,
          status: hasAvailability
            ? next.status === "only_if_needed"
              ? "only_if_needed"
              : "available"
            : "unavailable"
        };
      })
    );
  }

  function toggleTemplate(date: string, templateId: string) {
    if (!isSubmissionOpen) return;
    const entry = entries.find((item) => item.date === date);
    const current = entry?.availableShiftTemplateIds ?? [];
    const next = current.includes(templateId)
      ? current.filter((id) => id !== templateId)
      : [...current, templateId];

    updateEntry(date, { availableShiftTemplateIds: next });
  }

  function setAllDay(date: string) {
    if (!isSubmissionOpen) return;
    updateEntry(date, {
      status: "available",
      availableShiftTemplateIds: allTemplateIds
    });
  }

  function setUnavailable(date: string) {
    if (!isSubmissionOpen) return;
    updateEntry(date, {
      status: "unavailable",
      availableShiftTemplateIds: []
    });
  }

  return (
    <section className="card">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>הגשת סידור חודשית</h2>
          <p className="lead">
            בכל יום בוחרים לאילו משמרות אפשר לעבוד. אם אפשר כל היום, לוחצים פנוי כל היום.
          </p>
        </div>
        <div className="actions">
          <span className={isSubmissionOpen ? "badge success" : "badge critical"}>
            {isSubmissionOpen ? "ההגשה פתוחה" : "ההגשה סגורה"}
          </span>
          {saved ? <span className="badge success">נשמר מקומית</span> : null}
          <button
            className="button primary"
            disabled={!isSubmissionOpen}
            onClick={() => setSaved(true)}
          >
            שמירת הגשה
          </button>
        </div>
      </div>

      <div className={isSubmissionOpen ? "submission-banner open" : "submission-banner closed"}>
        {isSubmissionOpen ? <CalendarClock size={20} /> : <Lock size={20} />}
        <div>
          <strong>
            {isSubmissionOpen
              ? "אפשר להגיש משמרות לחודש הבא"
              : "הגשת המשמרות סגורה כרגע"}
          </strong>
          <span>
            חלון ההגשה הקבוע הוא {getSubmissionWindowLabel()}. מחוץ לחלון הזה רק
            מנהל/ת יכולים לפתוח גישה ידנית.
          </span>
        </div>
      </div>

      <div className="availability-summary">
        <div className="summary-pill">
          <span className="badge success">ימים עם זמינות</span>
          <strong>{availableDays}</strong>
        </div>
        <div className="summary-pill">
          <span className="badge warning">רק אם חייבים</span>
          <strong>{onlyIfNeededDays}</strong>
        </div>
      </div>

      <div className="availability-board">
        {days.map((day) => {
          const date = format(day, "yyyy-MM-dd");
          const entry = entries.find((item) => item.date === date);
          if (!entry) return null;
          const selectedTemplates = entry.availableShiftTemplateIds ?? [];
          const isAllDay = allTemplateIds.every((id) => selectedTemplates.includes(id));

          return (
            <article className="availability-card" key={date}>
              <div className="shift-title">
                <div>
                  <strong>{format(day, "EEEE", { locale: he })}</strong>
                  <div className="metric-label">{format(day, "d בMMMM", { locale: he })}</div>
                </div>
                <AvailabilityBadge status={entry.status} />
              </div>

              <div className="shift-availability-grid">
                <button
                  className={`status-button ${isAllDay ? "active" : ""}`}
                  disabled={!isSubmissionOpen}
                  onClick={() => setAllDay(date)}
                >
                  פנוי כל היום
                </button>
                {templates.map((template) => (
                  <button
                    className={`status-button ${
                      selectedTemplates.includes(template.id) ? "active" : ""
                    }`}
                    disabled={!isSubmissionOpen}
                    key={template.id}
                    onClick={() => toggleTemplate(date, template.id)}
                  >
                    {template.name}
                  </button>
                ))}
                <button
                  className="status-button"
                  disabled={!isSubmissionOpen}
                  onClick={() => setUnavailable(date)}
                >
                  לא פנוי
                </button>
              </div>

              <label className="checkbox-row">
                <input
                  checked={entry.status === "only_if_needed"}
                  disabled={!isSubmissionOpen || !selectedTemplates.length}
                  type="checkbox"
                  onChange={(event) =>
                    updateEntry(date, {
                      status: event.target.checked ? "only_if_needed" : "available"
                    })
                  }
                />
                רק אם חייבים
              </label>

              <textarea
                className="textarea"
                disabled={!isSubmissionOpen}
                placeholder="הערות למנהל/ת"
                value={entry.note ?? ""}
                onChange={(event) => updateEntry(date, { note: event.target.value })}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
