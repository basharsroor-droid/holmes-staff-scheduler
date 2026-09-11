"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gauge, RefreshCw } from "lucide-react";

import { useScheduleData, type ScheduleShift } from "@/app/workspace/schedule-builder/schedule-data";
import { shiftBounds, weekStartKey } from "@/lib/shift-time";

type Period = { id: string; department_id: string; year: number; month: number };
type Worker = {
  user_id: string;
  department_ids: string[];
  weekly_hours_limit: number | null;
  profile: { first_name: string; last_name: string } | null;
};
type Leave = { user_id: string; start_date: string; end_date: string };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };

type Driver = { key: string; label: string; count: number; points: number; severity: "critical" | "warning" };

function hours(shift: ScheduleShift) {
  const { start, end } = shiftBounds(shift);
  return (end.getTime() - start.getTime()) / 3600000;
}

// Recomputed from the shared schedule data (schedule-data.tsx) whenever the
// board changes -- no fetch and no DOM watching (B3). "Recalculate" refreshes
// the server data to pick up other managers' changes.
export function ShiftPilotScore({
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
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const { selectedPeriodId, shifts: windowShifts, assignments } = useScheduleData();

  const { score, drivers } = useMemo(() => {
    const scanPeriod = periods.find((item) => item.id === selectedPeriodId);
    if (!scanPeriod) return { score: 100, drivers: [] as Driver[] };

    const shifts = windowShifts.filter((shift) => shift.status !== "cancelled");
    const selected = shifts.filter((shift) => shift.schedule_period_id === selectedPeriodId);

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
        if (
          approvedLeave.some(
            (item) =>
              item.user_id === assignment.user_id &&
              shift.shift_date >= item.start_date &&
              shift.shift_date <= item.end_date
          )
        )
          leaveConflict += 1;
        const submission = submissions.find(
          (item) =>
            item.schedule_period_id === shift.schedule_period_id &&
            item.user_id === assignment.user_id &&
            item.submitted_at
        );
        const status =
          submission && shift.shift_template_id
            ? availability.find(
                (item) =>
                  item.submission_id === submission.id &&
                  item.shift_date === shift.shift_date &&
                  item.shift_template_id === shift.shift_template_id
              )?.status
            : null;
        if (status === "unavailable") unavailable += 1;
      }
    }

    const usersInPeriod = [
      ...new Set(assignments.filter((a) => selected.some((s) => s.id === a.shift_id)).map((a) => a.user_id))
    ];
    for (const userId of usersInPeriod) {
      const userShifts = shifts
        .filter((shift) => assignments.some((a) => a.shift_id === shift.id && a.user_id === userId))
        .sort((a, b) => shiftBounds(a).start.getTime() - shiftBounds(b).start.getTime());
      for (let index = 0; index < userShifts.length - 1; index++) {
        const current = userShifts[index];
        const following = userShifts[index + 1];
        if (!selected.some((shift) => shift.id === current.id || shift.id === following.id)) continue;
        const a = shiftBounds(current);
        const b = shiftBounds(following);
        if (b.start < a.end) overlap += 1;
        else if (minRestHours) {
          const gap = (b.start.getTime() - a.end.getTime()) / 3600000;
          if (gap < minRestHours) restWarnings += 1;
        }
      }

      const limit = workers.find((worker) => worker.user_id === userId)?.weekly_hours_limit;
      if (limit) {
        const weeks = [
          ...new Set(
            userShifts
              .filter((shift) => selected.some((s) => s.id === shift.id))
              .map((shift) => weekStartKey(shift.shift_date))
          )
        ];
        for (const week of weeks) {
          const total = userShifts
            .filter((shift) => weekStartKey(shift.shift_date) === week)
            .reduce((sum, shift) => sum + hours(shift), 0);
          if (total > limit) weeklyOverruns += 1;
        }
      }
    }

    const allDrivers: Driver[] = [
      { key: "coverage", label: "כיסוי חסר", count: understaffed, points: understaffed * 8, severity: "critical" },
      { key: "overlap", label: "משמרות חופפות", count: overlap, points: overlap * 15, severity: "critical" },
      {
        key: "leave",
        label: "שיבוץ בזמן Time Off",
        count: leaveConflict,
        points: leaveConflict * 15,
        severity: "critical"
      },
      {
        key: "availability",
        label: "שיבוץ בניגוד לזמינות",
        count: unavailable,
        points: unavailable * 12,
        severity: "critical"
      },
      { key: "rest", label: "מנוחה קצרה", count: restWarnings, points: restWarnings * 4, severity: "warning" },
      {
        key: "hours",
        label: "חריגה ממכסת שעות",
        count: weeklyOverruns,
        points: weeklyOverruns * 4,
        severity: "warning"
      }
    ];
    const nextDrivers = allDrivers.filter((driver) => driver.count > 0);
    const deductions = nextDrivers.reduce((sum, driver) => sum + driver.points, 0);
    return { score: Math.max(0, 100 - deductions), drivers: nextDrivers };
  }, [
    approvedLeave,
    assignments,
    availability,
    minRestHours,
    periods,
    selectedPeriodId,
    submissions,
    windowShifts,
    workers
  ]);

  const label = score >= 90 ? "מצוין" : score >= 75 ? "טוב" : score >= 60 ? "דורש תשומת לב" : "בסיכון גבוה";

  return (
    <section className="template-list-card no-print" aria-live="polite">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">Phase 2 · Scheduling Intelligence</p>
          <h2>
            <Gauge size={20} /> ShiftPilot Score
          </h2>
          <p className="card-muted">ציון בריאות שקוף לסידור — כל נקודה שיורדת מוסברת למנהל.</p>
        </div>
        <button
          type="button"
          className="button"
          disabled={refreshing || !selectedPeriodId}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw size={15} /> {refreshing ? "מחשב..." : "חשב מחדש"}
        </button>
      </div>
      <div className="workspace-stats schedule-stats">
        <article>
          <Gauge />
          <span>
            <strong>{score}</strong>
            <small>מתוך 100 · {label}</small>
          </span>
        </article>
        <article>
          <span>
            <strong>
              {drivers.filter((item) => item.severity === "critical").reduce((sum, item) => sum + item.count, 0)}
            </strong>
            <small>בעיות קריטיות</small>
          </span>
        </article>
        <article>
          <span>
            <strong>
              {drivers.filter((item) => item.severity === "warning").reduce((sum, item) => sum + item.count, 0)}
            </strong>
            <small>אזהרות</small>
          </span>
        </article>
      </div>
      {!drivers.length ? (
        <div className="submission-banner open">
          <div>
            <strong>100/100 — הסידור נקי</strong>
            <span>לא נמצאו כרגע גורמים שמורידים את הציון.</span>
          </div>
        </div>
      ) : (
        <div className="template-list" style={{ marginTop: 12 }}>
          {drivers.map((driver) => (
            <article className="card" key={driver.key}>
              <div className="mini-row">
                <span>
                  <strong>{driver.label}</strong>
                  <small>
                    {driver.count} מקרים · ‎-{driver.points} נקודות
                  </small>
                </span>
                <span className={`badge ${driver.severity === "critical" ? "critical" : "warning"}`}>
                  {driver.severity === "critical" ? "קריטי" : "אזהרה"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="card-muted" style={{ marginTop: 10 }}>
        הציון הוא כלי הסבר תפעולי, לא החלטת AI: Critical מוריד יותר מ־Warning, והמנהל רואה בדיוק למה.
      </p>
    </section>
  );
}
