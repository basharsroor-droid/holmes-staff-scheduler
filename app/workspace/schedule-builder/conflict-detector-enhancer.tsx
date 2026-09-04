"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Period = { id: string; department_id: string; year: number; month: number };
type Worker = { user_id: string; department_ids: string[]; weekly_hours_limit: number | null; profile: { first_name: string; last_name: string } | null };
type Leave = { user_id: string; start_date: string; end_date: string };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; status: string };
type Assignment = { shift_id: string; user_id: string };

type Finding = {
  key: string;
  severity: "critical" | "warning";
  title: string;
  detail: string;
};

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

export function ConflictDetectorEnhancer({
  periods,
  workers,
  submissions,
  availability,
  approvedLeave,
  minRestHours
}: {
  periods: Period[];
  workers: Worker[];
  submissions: Submission[];
  availability: Availability[];
  approvedLeave: Leave[];
  minRestHours: number | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [checking, setChecking] = useState(false);

  const workerName = useCallback((userId: string) => {
    const profile = workers.find((worker) => worker.user_id === userId)?.profile;
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "עובד/ת";
  }, [workers]);

  const scan = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setChecking(true);
    const db = supabase as any;
    const period = periods.find((item) => item.id === periodId);
    if (!period) { setChecking(false); return; }

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
    const next: Finding[] = [];

    for (const shift of selected) {
      const assigned = assignments.filter((item) => item.shift_id === shift.id);
      if (assigned.length < shift.required_employees) {
        next.push({ key: `coverage-${shift.id}`, severity: "critical", title: "כיסוי חסר", detail: `${shift.shift_date} · ${shift.name}: ${assigned.length}/${shift.required_employees} משובצים.` });
      }
      for (const assignment of assigned) {
        const leave = approvedLeave.find((item) => item.user_id === assignment.user_id && shift.shift_date >= item.start_date && shift.shift_date <= item.end_date);
        if (leave) next.push({ key: `leave-${shift.id}-${assignment.user_id}`, severity: "critical", title: "שיבוץ בזמן Time Off", detail: `${workerName(assignment.user_id)} משובץ/ת ב-${shift.shift_date} בזמן חופשה מאושרת.` });

        const submission = submissions.find((item) => item.schedule_period_id === shift.schedule_period_id && item.user_id === assignment.user_id && item.submitted_at);
        const status = submission && shift.shift_template_id
          ? availability.find((item) => item.submission_id === submission.id && item.shift_date === shift.shift_date && item.shift_template_id === shift.shift_template_id)?.status
          : null;
        if (status === "unavailable") next.push({ key: `availability-${shift.id}-${assignment.user_id}`, severity: "critical", title: "שיבוץ בניגוד לזמינות", detail: `${workerName(assignment.user_id)} סימן/ה לא זמין/ה ל-${shift.name} ב-${shift.shift_date}.` });
      }
    }

    const usersInPeriod = [...new Set(assignments.filter((a) => selected.some((s) => s.id === a.shift_id)).map((a) => a.user_id))];
    for (const userId of usersInPeriod) {
      const userShifts = shifts.filter((shift) => assignments.some((a) => a.shift_id === shift.id && a.user_id === userId)).sort((a, b) => bounds(a).start.getTime() - bounds(b).start.getTime());
      for (let index = 0; index < userShifts.length - 1; index++) {
        const current = userShifts[index];
        const following = userShifts[index + 1];
        const a = bounds(current);
        const b = bounds(following);
        if (b.start < a.end) {
          if (selected.some((shift) => shift.id === current.id || shift.id === following.id)) next.push({ key: `overlap-${current.id}-${following.id}-${userId}`, severity: "critical", title: "משמרות חופפות", detail: `${workerName(userId)} משובץ/ת במשמרות שחופפות בזמן.` });
        } else if (minRestHours) {
          const gap = (b.start.getTime() - a.end.getTime()) / 3600000;
          if (gap < minRestHours && selected.some((shift) => shift.id === current.id || shift.id === following.id)) next.push({ key: `rest-${current.id}-${following.id}-${userId}`, severity: "warning", title: "מנוחה קצרה", detail: `${workerName(userId)} מקבל/ת ${Math.round(gap * 10) / 10} שעות מנוחה בלבד (מינימום: ${minRestHours}).` });
        }
      }

      const limit = workers.find((worker) => worker.user_id === userId)?.weekly_hours_limit;
      if (limit) {
        const weeks = [...new Set(userShifts.filter((shift) => selected.some((s) => s.id === shift.id)).map((shift) => weekStartKey(shift.shift_date)))];
        for (const week of weeks) {
          const total = userShifts.filter((shift) => weekStartKey(shift.shift_date) === week).reduce((sum, shift) => sum + hours(shift), 0);
          if (total > limit) next.push({ key: `hours-${userId}-${week}`, severity: "warning", title: "חריגה ממכסת שעות", detail: `${workerName(userId)} מגיע/ה ל-${Math.round(total * 10) / 10} שעות בשבוע שמתחיל ${week} (מכסה: ${limit}).` });
        }
      }
    }

    setFindings(Array.from(new Map(next.map((item) => [item.key, item])).values()));
    setChecking(false);
  }, [approvedLeave, availability, minRestHours, periods, submissions, supabase, workerName, workers]);

  useEffect(() => {
    const syncPeriod = () => {
      const select = document.querySelector<HTMLSelectElement>(".schedule-period-select");
      const id = select?.value ?? periods[0]?.id ?? "";
      setSelectedPeriodId(id);
      void scan(id);
    };
    syncPeriod();
    const root = document.querySelector(".schedule-workbench");
    if (!root) return;
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(syncPeriod, 120);
    });
    observer.observe(root, { subtree: true, attributes: true, childList: true, attributeFilter: ["aria-pressed", "value", "class"] });
    root.addEventListener("change", syncPeriod);
    return () => {
      observer.disconnect();
      root.removeEventListener("change", syncPeriod);
      window.clearTimeout(timer);
    };
  }, [periods, scan]);

  const critical = findings.filter((item) => item.severity === "critical");
  const warnings = findings.filter((item) => item.severity === "warning");

  return <section className="template-list-card no-print" aria-live="polite">
    <div className="template-list-heading">
      <div><p className="eyebrow">Phase 2 · Scheduling Intelligence</p><h2><ShieldAlert size={20} /> Conflict Detector</h2><p className="card-muted">בדיקת סיכונים חיה לפני פרסום — ללא שינוי אוטומטי בשיבוצים.</p></div>
      <button type="button" className="button" disabled={checking || !selectedPeriodId} onClick={() => void scan(selectedPeriodId)}>{checking ? "בודק..." : "בדיקה מחדש"}</button>
    </div>
    {!checking && !findings.length ? <div className="submission-banner open"><CheckCircle2 size={18} /><div><strong>לא נמצאו התנגשויות</strong><span>הסידור הנוכחי נקי מהסיכונים שהמערכת בודקת כרגע.</span></div></div> : null}
    {critical.length ? <div className="submission-banner" style={{ marginTop: 12 }}><AlertTriangle size={18} /><div><strong>{critical.length} בעיות קריטיות לפני פרסום</strong><span>מומלץ לפתור אותן לפני שמפרסמים לצוות.</span></div></div> : null}
    <div className="template-list" style={{ marginTop: findings.length ? 12 : 0 }}>
      {findings.map((item) => <article className="card" key={item.key}><div className="mini-row"><AlertTriangle size={17} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className={`badge ${item.severity === "critical" ? "critical" : "warning"}`}>{item.severity === "critical" ? "קריטי" : "אזהרה"}</span></div></article>)}
    </div>
    {warnings.length ? <p className="card-muted" style={{ marginTop: 10 }}>{warnings.length} אזהרות הן advisory בלבד — המנהל נשאר בעל ההחלטה הסופית.</p> : null}
  </section>;
}
