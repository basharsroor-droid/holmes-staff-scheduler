"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, RefreshCw } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Period = { id: string; department_id: string; year: number; month: number };
type Worker = { user_id: string; department_ids: string[]; weekly_hours_limit: number | null; profile: { first_name: string; last_name: string } | null };
type Leave = { user_id: string; start_date: string; end_date: string };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; status: string };
type Assignment = { shift_id: string; user_id: string };

type Driver = { key: string; label: string; count: number; points: number; severity: "critical" | "warning" };

function bounds(shift: Shift) {
  const start = new Date(`${shift.shift_date}T${shift.start_time}`);
  let end = new Date(`${shift.shift_date}T${shift.end_time}`);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function hours(shift: Shift) {
  const { start, end } = bounds(shift);
  return (end.getTime() - start.getTime()) / 3600000;
}

function weekStartKey(date: string) {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() - day.getDay());
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function ShiftPilotScore({ periods, workers, submissions, availability, approvedLeave, minRestHours }: {
  periods: Period[];
  workers: Worker[];
  submissions: Submission[];
  availability: Availability[];
  approvedLeave: Leave[];
  minRestHours: number | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [score, setScore] = useState(100);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [checking, setChecking] = useState(false);

  const scan = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setChecking(true);
    const db = supabase as any;
    const [{ data: allShifts }, { data: periodShifts }] = await Promise.all([
      db.from("shifts").select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status").neq("status", "cancelled"),
      db.from("shifts").select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status").eq("schedule_period_id", periodId).neq("status", "cancelled")
    ]);
    const shifts = (allShifts ?? []) as Shift[];
    const selected = (periodShifts ?? []) as Shift[];
    const shiftIds = shifts.map((shift) => shift.id);
    const { data: assignmentRows } = shiftIds.length
      ? await db.from("shift_assignments").select("shift_id, user_id").in("shift_id", shiftIds)
      : { data: [] };
    const assignments = (assignmentRows ?? []) as Assignment[];

    let understaffed = 0;
    let overlap = 0;
    let leaveConflict = 0;
    let unavailable = 0;
    let restWarnings = 0;
    let weeklyOverruns = 0;

    for (const shift of selected) {
      const assigned = assignments.filter((item) => item.shift_id === shift.id);
      if (assigned.length < shift.required_employees) understaffed += 1;
      for (const assignment of assigned) {
        if (approvedLeave.some((item) => item.user_id === assignment.user_id && shift.shift_date >= item.start_date && shift.shift_date <= item.end_date)) leaveConflict += 1;
        const submission = submissions.find((item) => item.schedule_period_id === shift.schedule_period_id && item.user_id === assignment.user_id && item.submitted_at);
        const status = submission && shift.shift_template_id
          ? availability.find((item) => item.submission_id === submission.id && item.shift_date === shift.shift_date && item.shift_template_id === shift.shift_template_id)?.status
          : null;
        if (status === "unavailable") unavailable += 1;
      }
    }

    const usersInPeriod = [...new Set(assignments.filter((a) => selected.some((s) => s.id === a.shift_id)).map((a) => a.user_id))];
    for (const userId of usersInPeriod) {
      const userShifts = shifts.filter((shift) => assignments.some((a) => a.shift_id === shift.id && a.user_id === userId)).sort((a, b) => bounds(a).start.getTime() - bounds(b).start.getTime());
      for (let index = 0; index < userShifts.length - 1; index++) {
        const current = userShifts[index];
        const following = userShifts[index + 1];
        if (!selected.some((shift) => shift.id === current.id || shift.id === following.id)) continue;
        const a = bounds(current);
        const b = bounds(following);
        if (b.start < a.end) overlap += 1;
        else if (minRestHours) {
          const gap = (b.start.getTime() - a.end.getTime()) / 3600000;
          if (gap < minRestHours) restWarnings += 1;
        }
      }

      const limit = workers.find((worker) => worker.user_id === userId)?.weekly_hours_limit;
      if (limit) {
        const weeks = [...new Set(userShifts.filter((shift) => selected.some((s) => s.id === shift.id)).map((shift) => weekStartKey(shift.shift_date)))];
        for (const week of weeks) {
          const total = userShifts.filter((shift) => weekStartKey(shift.shift_date) === week).reduce((sum, shift) => sum + hours(shift), 0);
          if (total > limit) weeklyOverruns += 1;
        }
      }
    }

    const nextDrivers: Driver[] = [
      { key: "coverage", label: "כיסוי חסר", count: understaffed, points: understaffed * 8, severity: "critical" },
      { key: "overlap", label: "משמרות חופפות", count: overlap, points: overlap * 15, severity: "critical" },
      { key: "leave", label: "שיבוץ בזמן Time Off", count: leaveConflict, points: leaveConflict * 15, severity: "critical" },
      { key: "availability", label: "שיבוץ בניגוד לזמינות", count: unavailable, points: unavailable * 12, severity: "critical" },
      { key: "rest", label: "מנוחה קצרה", count: restWarnings, points: restWarnings * 4, severity: "warning" },
      { key: "hours", label: "חריגה ממכסת שעות", count: weeklyOverruns, points: weeklyOverruns * 4, severity: "warning" }
    ].filter((driver) => driver.count > 0);

    const deductions = nextDrivers.reduce((sum, driver) => sum + driver.points, 0);
    setDrivers(nextDrivers);
    setScore(Math.max(0, 100 - deductions));
    setChecking(false);
  }, [approvedLeave, availability, minRestHours, submissions, supabase, workers]);

  useEffect(() => {
    const sync = () => {
      const select = document.querySelector<HTMLSelectElement>(".schedule-period-select");
      const id = select?.value ?? periods[0]?.id ?? "";
      setSelectedPeriodId(id);
      void scan(id);
    };
    sync();
    const root = document.querySelector(".schedule-workbench");
    if (!root) return;
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 120);
    });
    observer.observe(root, { subtree: true, attributes: true, childList: true, attributeFilter: ["aria-pressed", "value", "class"] });
    root.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      root.removeEventListener("change", sync);
      window.clearTimeout(timer);
    };
  }, [periods, scan]);

  const label = score >= 90 ? "מצוין" : score >= 75 ? "טוב" : score >= 60 ? "דורש תשומת לב" : "בסיכון גבוה";

  return <section className="template-list-card no-print" aria-live="polite">
    <div className="template-list-heading">
      <div><p className="eyebrow">Phase 2 · Scheduling Intelligence</p><h2><Gauge size={20} /> ShiftPilot Score</h2><p className="card-muted">ציון בריאות שקוף לסידור — כל נקודה שיורדת מוסברת למנהל.</p></div>
      <button type="button" className="button" disabled={checking || !selectedPeriodId} onClick={() => void scan(selectedPeriodId)}><RefreshCw size={15} /> {checking ? "מחשב..." : "חשב מחדש"}</button>
    </div>
    <div className="workspace-stats schedule-stats">
      <article><Gauge /><span><strong>{score}</strong><small>מתוך 100 · {label}</small></span></article>
      <article><span><strong>{drivers.filter((item) => item.severity === "critical").reduce((sum, item) => sum + item.count, 0)}</strong><small>בעיות קריטיות</small></span></article>
      <article><span><strong>{drivers.filter((item) => item.severity === "warning").reduce((sum, item) => sum + item.count, 0)}</strong><small>אזהרות</small></span></article>
    </div>
    {!drivers.length ? <div className="submission-banner open"><div><strong>100/100 — הסידור נקי</strong><span>לא נמצאו כרגע גורמים שמורידים את הציון.</span></div></div> : <div className="template-list" style={{ marginTop: 12 }}>
      {drivers.map((driver) => <article className="card" key={driver.key}><div className="mini-row"><span><strong>{driver.label}</strong><small>{driver.count} מקרים · ‎-{driver.points} נקודות</small></span><span className={`badge ${driver.severity === "critical" ? "critical" : "warning"}`}>{driver.severity === "critical" ? "קריטי" : "אזהרה"}</span></div></article>)}
    </div>}
    <p className="card-muted" style={{ marginTop: 10 }}>הציון הוא כלי הסבר תפעולי, לא החלטת AI: Critical מוריד יותר מ־Warning, והמנהל רואה בדיוק למה.</p>
  </section>;
}
