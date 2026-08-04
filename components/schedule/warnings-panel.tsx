"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

import type { ScheduledShift, ShiftTemplate, ShiftWarning } from "@/types/scheduler";
import { WarningBadge } from "@/components/schedule/badges";

export function WarningsPanel({
  warnings,
  schedule = [],
  templates = []
}: {
  warnings: ShiftWarning[];
  schedule?: ScheduledShift[];
  templates?: ShiftTemplate[];
}) {
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [offers, setOffers] = useState<string[]>([]);
  const openShiftWarnings = warnings.filter((warning) =>
    warning.message.includes("אין עובד משובץ")
  );
  const groupedWarnings = useMemo(() => {
    return openShiftWarnings.reduce<Record<string, ShiftWarning[]>>((groups, warning) => {
      groups[warning.date] = [...(groups[warning.date] ?? []), warning];
      return groups;
    }, {});
  }, [openShiftWarnings]);
  const dates = Object.keys(groupedWarnings).sort().slice(0, 12);

  function toggleDate(date: string) {
    setOpenDates((current) =>
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date]
    );
  }

  function offerHelp(date: string) {
    setOffers((current) => (current.includes(date) ? current : [...current, date]));
  }

  function shiftLabel(shiftId: string) {
    const shift = schedule.find((item) => item.id === shiftId);
    const template = templates.find((item) => item.id === shift?.shiftTemplateId);
    if (!template) return "משמרת פתוחה";
    return `${template.name} · ${template.startTime}-${template.endTime}`;
  }

  return (
    <section className="card">
      <h2>אזהרות פתוחות</h2>
      <div className="warning-list">
        {dates.length ? (
          dates.map((date) => {
            const isOpen = openDates.includes(date);
            const dateWarnings = groupedWarnings[date];

            return (
              <div className="warning-row" key={date}>
                <button className="warning-date-button" onClick={() => toggleDate(date)}>
                  <span>
                    <strong>{format(parseISO(date), "EEEE", { locale: he })}</strong>
                    <span>{format(parseISO(date), "dd/MM/yyyy")}</span>
                  </span>
                  <span className="badge critical">
                    {dateWarnings.length} משמרות חסרות
                  </span>
                </button>

                {isOpen ? (
                  <div className="open-shift-details">
                    {dateWarnings.map((warning) => (
                      <div className="mini-row" key={warning.shiftId}>
                        <span>{shiftLabel(warning.shiftId)}</span>
                        <WarningBadge severity={warning.severity} />
                      </div>
                    ))}
                    <button
                      className={`button ${offers.includes(date) ? "" : "primary"}`}
                      onClick={() => offerHelp(date)}
                    >
                      {offers.includes(date)
                        ? "נרשם שאפשר לעזור"
                        : "כן, אני יכול לעזור ביום זה"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="metric-label">אין משמרות פתוחות כרגע</div>
        )}
      </div>
    </section>
  );
}
