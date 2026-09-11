"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";

import {
  useScheduleData,
  type ScheduleAssignment,
  type ScheduleShift
} from "@/app/workspace/schedule-builder/schedule-data";
import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isPresent } from "@/lib/utils";
import { shiftBounds, shiftHours, shiftsOverlap, weekStartKey } from "@/lib/shift-time";

type Period = { id: string; department_id: string; year: number; month: number; status: string };
type Worker = {
  user_id: string;
  department_ids: string[];
  seniority_level: string;
  weekly_hours_limit: number | null;
  profile: { first_name: string; last_name: string } | null;
};
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };
type Leave = { user_id: string; start_date: string; end_date: string };
type Template = { id: string; requires_senior_employee: boolean };
type Shift = ScheduleShift;
type Assignment = ScheduleAssignment;
type RepairAction = {
  kind: "remove" | "add";
  shiftId: string;
  shiftLabel: string;
  userId: string;
  workerName: string;
  reason: string;
};

export function FixMySchedulePanel({
  organizationId,
  currentUserId,
  periods,
  workers,
  submissions,
  availability,
  approvedLeave,
  templates,
  minRestHours
}: {
  organizationId: string;
  currentUserId: string;
  periods: Period[];
  workers: Worker[];
  submissions: Submission[];
  availability: Availability[];
  approvedLeave: Leave[];
  templates: Template[];
  minRestHours: number | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const { selectedPeriodId, shifts: windowShifts, assignments: windowAssignments } = useScheduleData();
  const [actions, setActions] = useState<RepairAction[]>([]);
  const [unresolved, setUnresolved] = useState(0);
  const [busy, setBusy] = useState<"apply" | "">("");
  const { message, kind, setMessage } = useStatusMessage();

  const workerName = useCallback(
    (userId: string) => {
      const p = workers.find((w) => w.user_id === userId)?.profile;
      return p ? `${p.first_name} ${p.last_name}`.trim() : "עובד/ת";
    },
    [workers]
  );

  // Plans from the shared schedule data -- the selected month plus a week
  // either side, the same rows the board shows (B3). No fetch here; apply()
  // re-reads the database before writing.
  const generate = useCallback(() => {
    if (!selectedPeriodId) return;
    setMessage("");
    setActions([]);
    setUnresolved(0);
    const period = periods.find((p) => p.id === selectedPeriodId);
    if (!period) return;
    if (period.status === "published") {
      setMessage("Fix My Schedule עובד על טיוטה בלבד — יש לבטל את הפרסום לפני שינוי שיבוצים", "error");
      return;
    }

    const allShifts = windowShifts.filter((s) => s.status !== "cancelled");
    const existing = windowAssignments;
    const periodShifts = allShifts.filter((s) => s.schedule_period_id === selectedPeriodId);
    const periodWorkers = workers.filter((w) => w.department_ids.includes(period.department_id));
    const planned = existing.map((a) => ({ ...a }));
    const next: RepairAction[] = [];

    const availabilityStatus = (userId: string, shift: Shift) => {
      const sub = submissions.find(
        (s) => s.schedule_period_id === selectedPeriodId && s.user_id === userId && s.submitted_at
      );
      if (!sub || !shift.shift_template_id) return null;
      return (
        availability.find(
          (a) =>
            a.submission_id === sub.id &&
            a.shift_date === shift.shift_date &&
            a.shift_template_id === shift.shift_template_id
        )?.status ?? null
      );
    };

    const weeklyHours = (userId: string, week: string) =>
      allShifts
        .filter(
          (s) => weekStartKey(s.shift_date) === week && planned.some((a) => a.shift_id === s.id && a.user_id === userId)
        )
        .reduce((sum, s) => sum + shiftHours(s), 0);

    const assignedHours = (userId: string) =>
      allShifts
        .filter((s) => planned.some((a) => a.shift_id === s.id && a.user_id === userId))
        .reduce((sum, s) => sum + shiftHours(s), 0);

    const minGap = (userId: string, candidate: Shift) => {
      const c = shiftBounds(candidate);
      let gap = Infinity;
      for (const other of allShifts) {
        if (other.id === candidate.id || !planned.some((a) => a.shift_id === other.id && a.user_id === userId))
          continue;
        const b = shiftBounds(other);
        if (b.end <= c.start) gap = Math.min(gap, (c.start.getTime() - b.end.getTime()) / 3600000);
        else if (b.start >= c.end) gap = Math.min(gap, (b.start.getTime() - c.end.getTime()) / 3600000);
      }
      return gap;
    };

    for (const assignment of existing.filter((a) => periodShifts.some((s) => s.id === a.shift_id))) {
      const shift = periodShifts.find((s) => s.id === assignment.shift_id)!;
      const status = availabilityStatus(assignment.user_id, shift);
      const onLeave = approvedLeave.some(
        (l) => l.user_id === assignment.user_id && shift.shift_date >= l.start_date && shift.shift_date <= l.end_date
      );
      const conflict = periodShifts.some(
        (other) =>
          other.id !== shift.id &&
          planned.some((a) => a.shift_id === other.id && a.user_id === assignment.user_id) &&
          shiftsOverlap(other, shift)
      );
      let reason = "";
      if (onLeave) reason = "חופשה מאושרת בתאריך המשמרת";
      else if (status === "unavailable") reason = "העובד/ת סימן/ה לא זמין/ה למשמרת";
      else if (conflict) reason = "חפיפה עם משמרת אחרת";
      if (!reason) continue;
      const index = planned.findIndex((a) => a.id === assignment.id);
      if (index >= 0) planned.splice(index, 1);
      next.push({
        kind: "remove",
        shiftId: shift.id,
        shiftLabel: `${shift.shift_date} · ${shift.name} · ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`,
        userId: assignment.user_id,
        workerName: workerName(assignment.user_id),
        reason
      });
    }

    let missing = 0;
    for (const shift of [...periodShifts].sort((a, b) =>
      `${a.shift_date} ${a.start_time}`.localeCompare(`${b.shift_date} ${b.start_time}`)
    )) {
      let slots = Math.max(0, shift.required_employees - planned.filter((a) => a.shift_id === shift.id).length);
      while (slots > 0) {
        const template = templates.find((t) => t.id === shift.shift_template_id);
        const alreadySenior = planned.some(
          (a) =>
            a.shift_id === shift.id && periodWorkers.find((w) => w.user_id === a.user_id)?.seniority_level === "senior"
        );
        const needSenior = !!template?.requires_senior_employee && !alreadySenior;
        const candidates = periodWorkers
          .map((worker) => {
            if (planned.some((a) => a.shift_id === shift.id && a.user_id === worker.user_id)) return null;
            if (needSenior && worker.seniority_level !== "senior") return null;
            const status = availabilityStatus(worker.user_id, shift);
            if (!status || status === "unavailable") return null;
            if (
              approvedLeave.some(
                (l) =>
                  l.user_id === worker.user_id && shift.shift_date >= l.start_date && shift.shift_date <= l.end_date
              )
            )
              return null;
            if (
              allShifts.some(
                (other) =>
                  other.id !== shift.id &&
                  planned.some((a) => a.shift_id === other.id && a.user_id === worker.user_id) &&
                  shiftsOverlap(other, shift)
              )
            )
              return null;
            if (
              worker.weekly_hours_limit &&
              weeklyHours(worker.user_id, weekStartKey(shift.shift_date)) + shiftHours(shift) >
                worker.weekly_hours_limit
            )
              return null;
            if (minRestHours && minGap(worker.user_id, shift) < minRestHours) return null;
            let score = status === "preferred" ? 100 : status === "available" ? 80 : 55;
            score -= Math.min(30, assignedHours(worker.user_id) / 3);
            return { worker, status, score };
          })
          .filter(isPresent)
          .sort((a, b) => b.score - a.score || a.worker.user_id.localeCompare(b.worker.user_id));
        const chosen = candidates[0];
        if (!chosen) {
          missing += slots;
          break;
        }
        planned.push({
          id: `planned-${shift.id}-${chosen.worker.user_id}`,
          shift_id: shift.id,
          user_id: chosen.worker.user_id
        });
        next.push({
          kind: "add",
          shiftId: shift.id,
          shiftLabel: `${shift.shift_date} · ${shift.name} · ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`,
          userId: chosen.worker.user_id,
          workerName: workerName(chosen.worker.user_id),
          reason:
            chosen.status === "preferred"
              ? "מועדף/ת, עומד/ת בכל המגבלות ומאזן/ת את חלוקת השעות"
              : chosen.status === "available"
                ? "זמין/ה, עומד/ת בכל המגבלות ומאזן/ת את חלוקת השעות"
                : "זמין/ה רק אם צריך; נבחר/ה לאחר שלא נמצא מועמד עדיף"
        });
        slots -= 1;
      }
    }

    setActions(next);
    setUnresolved(missing);
    setMessage(
      next.length
        ? `נבנתה תוכנית תיקון עם ${next.length} פעולות מוצעות`
        : "לא נמצאו שינויים בטוחים ונחוצים לסידור הנוכחי"
    );
  }, [
    approvedLeave,
    availability,
    minRestHours,
    periods,
    selectedPeriodId,
    submissions,
    templates,
    windowAssignments,
    windowShifts,
    workerName,
    workers
  ]);

  const apply = useCallback(async () => {
    if (!actions.length) return;
    const period = periods.find((p) => p.id === selectedPeriodId);
    if (!period || period.status === "published") {
      setActions([]);
      setMessage("לא ניתן להחיל Fix My Schedule על סידור שפורסם — יש לבטל את הפרסום ולבנות תוכנית מחדש", "error");
      return;
    }
    if (!window.confirm(`להחיל ${actions.length} פעולות תיקון על הטיוטה? הפעולה אינה מפרסמת את הסידור`)) return;
    setBusy("apply");
    setMessage("");
    const db = supabase;

    // Re-read the database before writing: the plan was built from the data on
    // screen, and another manager may have changed the month since.
    const [{ data: currentPeriod }, { data: currentShiftRows }] = await Promise.all([
      db.from("schedule_periods").select("id, status").eq("id", selectedPeriodId).single(),
      db
        .from("shifts")
        .select("id, required_employees, status")
        .eq("schedule_period_id", selectedPeriodId)
        .neq("status", "cancelled")
    ]);
    if (!currentPeriod || currentPeriod.status === "published") {
      setBusy("");
      setActions([]);
      setMessage("התקופה פורסמה מאז יצירת התוכנית, ולא בוצע שינוי — בטלו את הפרסום ובנו תוכנית מחדש", "error");
      return;
    }

    const currentShiftIds = (currentShiftRows ?? []).map((s) => s.id);
    const { data: currentAssignmentRows } = currentShiftIds.length
      ? await db.from("shift_assignments").select("id, shift_id, user_id").in("shift_id", currentShiftIds)
      : { data: [] };
    const currentAssignments = (currentAssignmentRows ?? []) as Assignment[];

    for (const action of actions) {
      const currentShift = (currentShiftRows ?? []).find((s) => s.id === action.shiftId);
      if (!currentShift) {
        setBusy("");
        setActions([]);
        setMessage("אחת המשמרות השתנתה מאז יצירת התוכנית, ולא בוצע שינוי — יש לבנות תוכנית מחדש", "error");
        return;
      }
      if (
        action.kind === "remove" &&
        !currentAssignments.some((a) => a.shift_id === action.shiftId && a.user_id === action.userId)
      ) {
        setBusy("");
        setActions([]);
        setMessage("השיבוצים השתנו מאז יצירת התוכנית, ולא בוצע שינוי — יש לבנות תוכנית מחדש", "error");
        return;
      }
      if (action.kind === "add") {
        if (currentAssignments.some((a) => a.shift_id === action.shiftId && a.user_id === action.userId)) {
          setBusy("");
          setActions([]);
          setMessage("השיבוצים השתנו מאז יצירת התוכנית, ולא בוצע שינוי — יש לבנות תוכנית מחדש", "error");
          return;
        }
        const projectedCount =
          currentAssignments.filter((a) => a.shift_id === action.shiftId).length -
          actions.filter((a) => a.kind === "remove" && a.shiftId === action.shiftId).length +
          actions.filter((a) => a.kind === "add" && a.shiftId === action.shiftId).length;
        if (projectedCount > currentShift.required_employees) {
          setBusy("");
          setActions([]);
          setMessage("הכיסוי במשמרת השתנה מאז יצירת התוכנית, ולא בוצע שינוי — יש לבנות תוכנית מחדש", "error");
          return;
        }
      }
    }

    const removals = actions.filter((a) => a.kind === "remove");
    const additions = actions.filter((a) => a.kind === "add");
    for (const action of removals) {
      const { error } = await db
        .from("shift_assignments")
        .delete()
        .eq("shift_id", action.shiftId)
        .eq("user_id", action.userId);
      if (error) {
        setBusy("");
        setMessage(
          "החלת התיקון נעצרה בגלל שגיאה והסידור לא פורסם — יש לרענן ולבדוק את הטיוטה לפני ניסיון נוסף",
          "error"
        );
        return;
      }
    }
    if (additions.length) {
      const rows = additions.map((a) => ({
        organization_id: organizationId,
        shift_id: a.shiftId,
        user_id: a.userId,
        assigned_by: currentUserId
      }));
      const { error } = await db.from("shift_assignments").insert(rows);
      if (error) {
        setBusy("");
        setMessage(
          "חלק מפעולות ההסרה בוצעו, אך הוספת המחליפים נכשלה והסידור לא פורסם — יש לרענן ולבדוק את הטיוטה",
          "error"
        );
        return;
      }
    }
    setBusy("");
    setActions([]);
    setUnresolved(0);
    setMessage("תוכנית התיקון הוחלה על הטיוטה");
    // Re-render the page with fresh rows; the shared schedule data (and so the
    // board and every panel) picks them up.
    router.refresh();
  }, [actions, currentUserId, organizationId, periods, router, selectedPeriodId, supabase]);

  const removals = actions.filter((a) => a.kind === "remove").length;
  const additions = actions.filter((a) => a.kind === "add").length;
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const published = selectedPeriod?.status === "published";

  return (
    <section className="template-list-card no-print" aria-live="polite">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">Phase 3 · WOW Features</p>
          <h2>
            <Wrench size={20} /> Fix My Schedule
          </h2>
          <p className="card-muted">
            מזהה בעיות בטיוטה ומציע את סט השינויים המינימלי שאפשר להסביר: הסרת שיבוצים לא בטוחים והשלמת חוסרים עם
            מועמדים שעומדים במגבלות
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={busy !== "" || !selectedPeriodId || published}
            onClick={() => generate()}
          >
            <RefreshCw size={15} /> בניית תוכנית תיקון
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy !== "" || !actions.length || published}
            onClick={() => void apply()}
          >
            {busy === "apply" ? <Loader2 size={15} /> : <ShieldCheck size={15} />} אישור והחלה על הטיוטה
          </button>
        </div>
      </div>

      {published ? (
        <div className="submission-banner">
          <div>
            <strong>הסידור פורסם</strong>
            <span>Fix My Schedule מושבת עד לביטול הפרסום כדי למנוע שינוי שיבוצים שכבר נשלחו לעובדים</span>
          </div>
        </div>
      ) : null}
      <StatusMessage message={message} kind={kind} />
      {message ? (
        <p className="card-muted">
          {actions.length
            ? `${removals} הסרות · ${additions} הוספות${unresolved ? ` · ${unresolved} מקומות נשארו ללא פתרון בטוח` : ""}`
            : "שום שינוי לא בוצע אוטומטית"}
        </p>
      ) : null}

      {actions.length ? (
        <div className="template-list" style={{ marginTop: 12 }}>
          {actions.slice(0, 30).map((action, index) => (
            <article className="card" key={`${action.kind}-${action.shiftId}-${action.userId}-${index}`}>
              <div className="mini-row">
                <span>
                  <strong>{action.shiftLabel}</strong>
                  <small>
                    {action.workerName} · {action.reason}
                  </small>
                </span>
                <span className={`badge ${action.kind === "remove" ? "closing" : "opening"}`}>
                  {action.kind === "remove" ? "הסרה" : "הוספה"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {actions.length > 30 ? <p className="card-muted">מוצגות 30 הפעולות הראשונות מתוך {actions.length}.</p> : null}
      <p className="card-muted" style={{ marginTop: 10 }}>
        Fix My Schedule לא מפרסם סידור, ולפני ההחלה הוא מאמת מחדש שהתקופה והשיבוצים לא השתנו
      </p>
    </section>
  );
}
