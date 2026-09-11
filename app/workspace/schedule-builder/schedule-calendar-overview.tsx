"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, UsersRound } from "lucide-react";

import { useScheduleData } from "@/app/workspace/schedule-builder/schedule-data";
import { getIsraeliHolidaysForMonth } from "@/lib/israeli-holidays";

import styles from "./schedule-calendar-overview.module.css";

type Period = {
  id: string;
  year: number;
  month: number;
};

const monthNames = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר"
];

const weekdayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function localTodayKey() {
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function ScheduleCalendarOverview({ period }: { period: Period | null }) {
  const { shifts, assignments } = useScheduleData();
  const today = localTodayKey();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendar = useMemo(() => {
    if (!period) return null;

    const daysInMonth = new Date(period.year, period.month, 0).getDate();
    const firstWeekday = new Date(period.year, period.month - 1, 1).getDay();
    const holidays = getIsraeliHolidaysForMonth(period.year, period.month);
    const monthShifts = shifts.filter(
      (shift) => shift.schedule_period_id === period.id && shift.status !== "cancelled"
    );

    return {
      daysInMonth,
      firstWeekday,
      holidays,
      monthShifts
    };
  }, [period, shifts]);

  if (!period || !calendar) return null;

  const effectiveSelectedDate =
    selectedDate ??
    (today.startsWith(`${period.year}-${String(period.month).padStart(2, "0")}-`)
      ? today
      : dateKey(period.year, period.month, 1));
  const selectedShifts = calendar.monthShifts.filter((shift) => shift.shift_date === effectiveSelectedDate);
  const blankCells = Array.from({ length: calendar.firstWeekday }, (_, index) => `blank-${index}`);
  const dayCells = Array.from({ length: calendar.daysInMonth }, (_, index) => index + 1);

  return (
    <section className={styles.calendarCard} aria-label="לוח סידור חודשי">
      <div className={styles.calendarHeader}>
        <div>
          <p className={styles.eyebrow}>תצוגת חודש</p>
          <h2>
            <CalendarDays size={21} /> {monthNames[period.month - 1]} {period.year}
          </h2>
        </div>
        <span className={styles.holidayLegend}>חגים ומועדים בישראל מסומנים בלוח</span>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className={styles.monthGrid}>
        {blankCells.map((key) => (
          <span className={styles.blankCell} key={key} aria-hidden="true" />
        ))}
        {dayCells.map((day) => {
          const key = dateKey(period.year, period.month, day);
          const dayShifts = calendar.monthShifts.filter((shift) => shift.shift_date === key);
          const holiday = calendar.holidays.get(key);
          const assigned = dayShifts.reduce(
            (total, shift) => total + assignments.filter((assignment) => assignment.shift_id === shift.id).length,
            0
          );
          const required = dayShifts.reduce((total, shift) => total + shift.required_employees, 0);
          const complete = required > 0 && assigned >= required;

          return (
            <button
              type="button"
              className={`${styles.dayCell} ${effectiveSelectedDate === key ? styles.selected : ""} ${key === today ? styles.today : ""}`}
              onClick={() => setSelectedDate(key)}
              aria-label={`${day} ${monthNames[period.month - 1]}${holiday ? `, ${holiday.label}` : ""}, ${dayShifts.length} משמרות`}
              key={key}
            >
              <span className={styles.dayNumber}>{day}</span>
              {holiday ? <span className={styles.holiday}>{holiday.label}</span> : null}
              {dayShifts.length ? (
                <span className={styles.dayMeta}>
                  <span>{dayShifts.length} מש׳</span>
                  <span className={complete ? styles.complete : styles.needsStaffing}>
                    {complete ? <CheckCircle2 size={11} /> : <UsersRound size={11} />}
                    {assigned}/{required}
                  </span>
                </span>
              ) : (
                <span className={styles.emptyDay}>—</span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.dayDetail}>
        <div className={styles.dayDetailHeading}>
          <strong>
            {new Date(`${effectiveSelectedDate}T12:00:00`).toLocaleDateString("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long"
            })}
          </strong>
          {calendar.holidays.get(effectiveSelectedDate) ? (
            <span>{calendar.holidays.get(effectiveSelectedDate)?.label}</span>
          ) : null}
        </div>
        {selectedShifts.length ? (
          <div className={styles.shiftStrip}>
            {selectedShifts.map((shift) => {
              const assigned = assignments.filter((assignment) => assignment.shift_id === shift.id).length;
              return (
                <span className={styles.shiftPill} key={shift.id}>
                  <strong>{shift.name}</strong>
                  <small>
                    {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)} · {assigned}/{shift.required_employees}
                  </small>
                </span>
              );
            })}
          </div>
        ) : (
          <p className={styles.noShifts}>אין משמרות ביום הזה</p>
        )}
      </div>
    </section>
  );
}
