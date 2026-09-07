"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Employee, ScheduledShift, ShiftTemplate } from "@/types/scheduler";

const weekdayLabels = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

export function FinalSchedule({
  days,
  schedule,
  employees,
  templates
}: {
  days: Date[];
  schedule: ScheduledShift[];
  employees: Employee[];
  templates: ShiftTemplate[];
}) {
  const firstScheduledDate = schedule[0]?.date ?? (days[0] ? format(days[0], "yyyy-MM-dd") : "");
  const [selectedDate, setSelectedDate] = useState(firstScheduledDate);

  const leadingEmptyDays = days[0]?.getDay() ?? 0;
  const calendarCells = useMemo(
    () => [...Array.from({ length: leadingEmptyDays }, () => null), ...days],
    [days, leadingEmptyDays]
  );

  const selectedIndex = days.findIndex((day) => format(day, "yyyy-MM-dd") === selectedDate);
  const selectedDay = selectedIndex >= 0 ? days[selectedIndex] : days[0];
  const selectedShifts = schedule.filter((shift) => shift.date === selectedDate);
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < days.length - 1;

  function moveSelectedDay(offset: number) {
    if (selectedIndex < 0) return;
    const nextDay = days[selectedIndex + offset];
    if (nextDay) setSelectedDate(format(nextDay, "yyyy-MM-dd"));
  }

  return (
    <div className="final-schedule-calendar">
      <div className="schedule-calendar-shell">
        <div className="schedule-calendar-weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="schedule-calendar-grid" role="grid" aria-label="לוח סידור עבודה">
          {calendarCells.map((day, index) => {
            if (!day) return <span className="schedule-calendar-empty" key={`empty-${index}`} />;
            const date = format(day, "yyyy-MM-dd");
            const dayShifts = schedule.filter((shift) => shift.date === date);
            const isSelected = date === selectedDate;
            const filledCount = dayShifts.filter((shift) => shift.employeeIds.length).length;
            const openCount = Math.max(0, dayShifts.length - filledCount);

            return (
              <button
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                className={`schedule-calendar-day ${isSelected ? "selected" : ""}`}
                key={date}
                onClick={() => setSelectedDate(date)}
              >
                <span className="schedule-calendar-number">{format(day, "d")}</span>
                <span className="schedule-calendar-dots">
                  {filledCount ? <i className="filled" title={`${filledCount} משמרות משובצות`} /> : null}
                  {openCount ? <i className="open" title={`${openCount} משמרות פתוחות`} /> : null}
                </span>
                <small>{dayShifts.length ? `${dayShifts.length} משמרות` : ""}</small>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <article className="selected-day-schedule">
          <header>
            <button
              type="button"
              className="selected-day-nav-button"
              onClick={() => moveSelectedDay(-1)}
              disabled={!canGoPrevious}
              aria-label="היום הקודם"
            >
              <ChevronRight size={20} />
            </button>

            <div className="selected-day-heading">
              <span>{format(selectedDay, "EEEE", { locale: he })}</span>
              <strong>{format(selectedDay, "dd/MM/yyyy")}</strong>
              <small>{selectedShifts.length} משמרות</small>
            </div>

            <button
              type="button"
              className="selected-day-nav-button"
              onClick={() => moveSelectedDay(1)}
              disabled={!canGoNext}
              aria-label="היום הבא"
            >
              <ChevronLeft size={20} />
            </button>
          </header>
          <div className="selected-day-shifts">
            {templates.map((template) => {
              const shift = selectedShifts.find((item) => item.shiftTemplateId === template.id);
              if (!shift) return null;
              const employee = employees.find((item) => item.id === shift.employeeIds[0]);
              const startTime = shift.startTime ?? template.startTime;
              const endTime = shift.endTime ?? template.endTime;
              return (
                <div className="selected-day-shift" key={template.id}>
                  <span className="selected-day-shift-main">
                    <strong>{template.name}</strong>
                    <small>{startTime}-{endTime}</small>
                  </span>
                  <b className={employee ? "" : "open"} style={employee ? { color: employee.color } : undefined}>
                    {employee?.fullName ?? "פתוח"}
                  </b>
                </div>
              );
            })}
            {!selectedShifts.length ? <div className="selected-day-empty">אין משמרות ביום הזה.</div> : null}
          </div>
        </article>
      ) : null}
    </div>
  );
}
