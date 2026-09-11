"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";

import { getIsraeliHolidaysForMonth } from "@/lib/israeli-holidays";

import styles from "./employee-holiday-calendar.module.css";

type Period = {
  id: string;
  branch_id: string;
  year: number;
  month: number;
  status: string;
  published_at: string | null;
};

type Branch = { id: string; name: string };

type Shift = {
  id: string;
  schedule_period_id: string;
  shift_date: string;
  name: string;
  start_time: string;
  end_time: string;
  manager_note: string | null;
  status: string;
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

export function EmployeeHolidayCalendar({
  periods,
  branches,
  shifts
}: {
  periods: Period[];
  branches: Branch[];
  shifts: Shift[];
}) {
  const today = localTodayKey();
  const currentPeriod = periods.find(
    (period) => `${period.year}-${String(period.month).padStart(2, "0")}` === today.slice(0, 7)
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? periods.at(-1)?.id ?? "");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const period = periods.find((item) => item.id === selectedPeriodId) ?? periods.at(-1);

  const calendar = useMemo(() => {
    if (!period) return null;

    const daysInMonth = new Date(period.year, period.month, 0).getDate();
    const firstWeekday = new Date(period.year, period.month - 1, 1).getDay();
    const holidays = getIsraeliHolidaysForMonth(period.year, period.month);
    const periodShifts = shifts.filter((shift) => shift.schedule_period_id === period.id);

    return {
      daysInMonth,
      firstWeekday,
      holidays,
      periodShifts
    };
  }, [period, shifts]);

  if (!period || !calendar) return null;

  const monthPrefix = `${period.year}-${String(period.month).padStart(2, "0")}-`;
  const effectiveSelectedDate = selectedDate?.startsWith(monthPrefix)
    ? selectedDate
    : today.startsWith(monthPrefix)
      ? today
      : dateKey(period.year, period.month, 1);
  const selectedHoliday = calendar.holidays.get(effectiveSelectedDate);
  const selectedShifts = calendar.periodShifts.filter((shift) => shift.shift_date === effectiveSelectedDate);
  const blankCells = Array.from({ length: calendar.firstWeekday }, (_, index) => `blank-${index}`);
  const dayCells = Array.from({ length: calendar.daysInMonth }, (_, index) => index + 1);
  const branchName = branches.find((branch) => branch.id === period.branch_id)?.name ?? "הסניף";

  return (
    <section className={styles.calendarCard} aria-label="לוח חגים ומשמרות אישי">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>הלוח שלי</p>
          <h2>
            <CalendarDays size={20} /> חגים ומשמרות
          </h2>
        </div>
        <select
          className={styles.periodSelect}
          aria-label="בחירת חודש בלוח"
          value={period.id}
          onChange={(event) => {
            setSelectedPeriodId(event.target.value);
            setSelectedDate(null);
          }}
        >
          {periods.map((item) => (
            <option value={item.id} key={item.id}>
              {monthNames[item.month - 1]} {item.year} · {branches.find((branch) => branch.id === item.branch_id)?.name ?? "סניף"}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.legend}>חגים, ערבי חג, חול המועד וימי זיכרון הרלוונטיים לסידור עבודה מסומנים בלוח</p>

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
          const holiday = calendar.holidays.get(key);
          const dayShifts = calendar.periodShifts.filter((shift) => shift.shift_date === key);

          return (
            <button
              type="button"
              className={`${styles.dayCell} ${holiday ? styles.holidayDay : ""} ${key === today ? styles.today : ""} ${effectiveSelectedDate === key ? styles.selected : ""}`}
              onClick={() => setSelectedDate(key)}
              aria-label={`${day} ${monthNames[period.month - 1]}${holiday ? `, ${holiday.label}` : ""}${dayShifts.length ? `, ${dayShifts.length} משמרות` : ""}`}
              key={key}
            >
              <span className={styles.dayNumber}>{day}</span>
              {holiday ? <span className={styles.holiday}>{holiday.label}</span> : null}
              {dayShifts.length ? <span className={styles.shiftCount}>{dayShifts.length} מש׳</span> : null}
            </button>
          );
        })}
      </div>

      <div className={styles.detail}>
        <div className={styles.detailHeading}>
          <strong>
            {new Date(`${effectiveSelectedDate}T12:00:00`).toLocaleDateString("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long"
            })}
          </strong>
          {selectedHoliday ? <span className={styles.detailHoliday}>{selectedHoliday.label}</span> : null}
        </div>

        {selectedShifts.length ? (
          <div className={styles.shiftList}>
            {selectedShifts.map((shift) => (
              <article className={styles.shiftItem} key={shift.id}>
                <strong>{shift.name}</strong>
                <span>
                  <Clock3 size={14} /> {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)} · {branchName}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.noShift}>אין לך משמרת ביום הזה</p>
        )}
      </div>
    </section>
  );
}
