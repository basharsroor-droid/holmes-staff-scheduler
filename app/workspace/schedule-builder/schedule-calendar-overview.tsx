"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";

import { useScheduleData } from "@/app/workspace/schedule-builder/schedule-data";
import { getIsraeliHolidaysForMonth } from "@/lib/israeli-holidays";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import styles from "./schedule-calendar-overview.module.css";

type Period = {
  id: string;
  year: number;
  month: number;
};

type NavigationPeriod = Period & {
  branch_id: string;
  department_id: string;
};

type MonthNavigationItem = {
  month: number;
  period: NavigationPeriod | null;
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
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const today = localTodayKey();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [navigationPeriods, setNavigationPeriods] = useState<NavigationPeriod[]>([]);
  const [currentContext, setCurrentContext] = useState<{ branchId: string; departmentId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNavigationPeriods() {
      if (!period) return;
      const { data } = await supabase
        .from("schedule_periods")
        .select("id, branch_id, department_id, year, month")
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      if (cancelled || !data) return;

      const current = data.find((item) => item.id === period.id);
      if (!current) return;

      setCurrentContext({ branchId: current.branch_id, departmentId: current.department_id });
      setNavigationPeriods(
        data.filter(
          (item) => item.branch_id === current.branch_id && item.department_id === current.department_id
        ) as NavigationPeriod[]
      );
    }

    void loadNavigationPeriods();
    return () => {
      cancelled = true;
    };
  }, [period, supabase]);

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

  const yearMonths: MonthNavigationItem[] = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month,
      period:
        navigationPeriods.find((item) => item.year === period.year && item.month === month) ?? null
    };
  });

  const goToMonth = (month: number) => {
    const existing = yearMonths.find((item) => item.month === month)?.period;
    setSelectedDate(null);
    if (existing) {
      router.push(`/workspace/schedule-builder?period=${existing.id}`);
      return;
    }
    if (!currentContext) return;

    const params = new URLSearchParams({
      year: String(period.year),
      month: String(month),
      branch: currentContext.branchId,
      department: currentContext.departmentId,
      return: "schedule-builder"
    });
    router.push(`/workspace/work-months?${params.toString()}`);
  };

  const previousMonth = period.month > 1 ? period.month - 1 : null;
  const nextMonth = period.month < 12 ? period.month + 1 : null;

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

      <div className={styles.monthNavigation} aria-label="ניווט בין חודשי השנה">
        <button
          type="button"
          className={styles.monthNavButton}
          disabled={!previousMonth || !currentContext}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          aria-label="לחודש הקודם"
        >
          <ChevronRight size={18} />
          <span>הקודם</span>
        </button>

        <select
          className={styles.monthSelect}
          aria-label="בחירת חודש"
          value={period.month}
          onChange={(event) => goToMonth(Number(event.target.value))}
          disabled={!currentContext}
        >
          {yearMonths.map((item) => (
            <option value={item.month} key={item.month}>
              {monthNames[item.month - 1]} {period.year}
              {item.period ? "" : " · טרם נפתח"}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={styles.monthNavButton}
          disabled={!nextMonth || !currentContext}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          aria-label="לחודש הבא"
        >
          <span>הבא</span>
          <ChevronLeft size={18} />
        </button>
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
