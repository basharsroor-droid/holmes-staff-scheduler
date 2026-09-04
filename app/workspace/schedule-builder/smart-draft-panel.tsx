"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Sparkles, WandSparkles } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Period = { id: string; department_id: string; year: number; month: number; status: string };
type Worker = { user_id: string; department_ids: string[]; seniority_level: string; weekly_hours_limit: number | null; profile: { first_name: string; last_name: string } | null };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };
type Leave = { user_id: string; start_date: string; end_date: string };
type Template = { id: string; department_id: string; requires_senior_employee: boolean };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; status: string };
type Assignment = { shift_id: string; user_id: string };
type Suggestion = { shiftId: string; shiftLabel: string; userId: string; workerName: string; score: number; reasons: string[] };

function shiftHours(shift: Shift) {
  const [startH, startM] = shift.start_time.split(":").map(Number);
  const [endH, endM] = shift.end_time.split(":").map(Number);
  let minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

function bounds(shift: Shift) {
  const start = new Date(`${shift.shift_date}T${shift.start_time}`);
  let end = new Date(`${shift.shift_date}T${shift.end_time}`);
  if (end <= start) end = new Date(end.getTime() + 86400000);
  return { start, end };
}

function overlaps(a: Shift, b: Shift) {
  const aa = bounds(a); const bb = bounds(b);
  return aa.start < bb.end && bb.start < aa.end;
}

function weekStartKey(date: string) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SmartDraftPanel({ organizationId, currentUserId, periods, workers, submissions, availability, approvedLeave, templates, minRestHours }: {
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
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unfilled, setUnfilled] = useState(0);
  const [busy, setBusy] = useState<"plan" | "apply" | "">("");
  const [message, setMessage] = useState("");

  const workerName = useCallback((userId: string) => {
    const p = workers.find((w) => w.user_id === userId)?.profile;
    return p ? `${p.first_name} ${p.last_name}`.trim() : "עובד/ת";
  }, [workers]);

  const generate = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setBusy("plan"); setMessage(""); setSuggestions([]); setUnfilled(0);
    const period = periods.find((p) => p.id === periodId);
    if (!period) { setBusy(""); return; }
    if (period.status === "published") {
      setBusy("");
      setMessage("Smart Draft עובד על טיוטה בלבד. יש לבטל פרסום לפני שינוי שיבוצים.");
      return;
    }

    const db = supabase as any;
    const { data: allShiftRows } = await db.from("shifts")
      .select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status")
      .neq("status", "cancelled");
    const allShifts = (allShiftRows ?? []) as Shift[];
    const shiftIds = allShifts.map((s) => s.id);
    const { data: assignmentRows } = shiftIds.length
      ? await db.from("shift_assignments").select("shift_id, user_id").in("shift_id", shiftIds)
      : { data: [] };
    const existing = (assignmentRows ?? []) as Assignment[];
    const periodShifts = allShifts.filter((s) => s.schedule_period_id === periodId);
    const periodWorkers = workers.filter((w) => w.department_ids.includes(period.department_id));
    const planned: Assignment[] = [...existing];
    const next: Suggestion[] = [];
    let missing = 0;

    const assignedHours = (userId: string) => allShifts
      .filter((s) => planned.some((a) => a.shift_id === s.id && a.user_id === userId))
      .reduce((sum, s) => sum + shiftHours(s), 0);

    const weeklyHours = (userId: string, week: string) => allShifts
      .filter((s) => weekStartKey(s.shift_date) === week && planned.some((a) => a.shift_id === s.id && a.user_id === userId))
      .reduce((sum, s) => sum + shiftHours(s), 0);

    const minGap = (userId: string, candidate: Shift) => {
      const c = bounds(candidate); let gap = Infinity;
      for (const other of allShifts) {
        if (other.id === candidate.id || !planned.some((a) => a.shift_id === other.id && a.user_id === userId)) continue;
        const b = bounds(other);
        if (b.end <= c.start) gap = Math.min(gap, (c.start.getTime() - b.end.getTime()) / 3600000);
        else if (b.start >= c.end) gap = Math.min(gap, (b.start.getTime() - c.end.getTime()) / 3600000);
      }
      return gap;
    };

    const availabilityStatus = (userId: string, shift: Shift) => {
      const sub = submissions.find((s) => s.schedule_period_id === periodId && s.user_id === userId && s.submitted_at);
      if (!sub || !shift.shift_template_id) return null;
      return availability.find((a) => a.submission_id === sub.id && a.shift_date === shift.shift_date && a.shift_template_id === shift.shift_template_id)?.status ?? null;
    };

    for (const shift of [...periodShifts].sort((a, b) => `${a.shift_date} ${a.start_time}`.localeCompare(`${b.shift_date} ${b.start_time}`))) {
      const already = planned.filter((a) => a.shift_id === shift.id).length;
      let slots = Math.max(0, shift.required_employees - already);
      while (slots > 0) {
        const template = templates.find((t) => t.id === shift.shift_template_id);
        const alreadySenior = planned.some((a) => a.shift_id === shift.id && periodWorkers.find((w) => w.user_id === a.user_id)?.seniority_level === "senior");
        const needSenior = !!template?.requires_senior_employee && !alreadySenior;

        const candidates = periodWorkers
          .filter((worker) => !planned.some((a) => a.shift_id === shift.id && a.user_id === worker.user_id))
          .map((worker) => {
            const reasons: string[] = [];
            if (needSenior && worker.seniority_level !== "senior") return null;
            const status = availabilityStatus(worker.user_id, shift);
            if (status === "unavailable" || status === null) return null;
            if (approvedLeave.some((l) => l.user_id === worker.user_id && shift.shift_date >= l.start_date && shift.shift_date <= l.end_date)) return null;
            const conflict = allShifts.some((other) => other.id !== shift.id && planned.some((a) => a.shift_id === other.id && a.user_id === worker.user_id) && overlaps(other, shift));
            if (conflict) return null;
            const week = weekStartKey(shift.shift_date);
            const projectedWeek = weeklyHours(worker.user_id, week) + shiftHours(shift);
            if (worker.weekly_hours_limit && projectedWeek > worker.weekly_hours_limit) return null;
            if (minRestHours && minGap(worker.user_id, shift) < minRestHours) return null;

            let score = 50;
            if (status === "preferred") { score += 30; reasons.push("משמרת מועדפת"); }
            else if (status === "available") { score += 20; reasons.push("זמין/ה"); }
            else if (status === "only_if_needed") { score += 5; reasons.push("רק אם צריך"); }

            const hours = assignedHours(worker.user_id);
            score -= Math.min(25, hours / 4);
            reasons.push(`${Math.round(hours * 10) / 10} שעות משובצות כרגע`);
            if (worker.seniority_level === "senior") score += 2;
            if (needSenior) reasons.push("משלים/ה דרישת Senior למשמרת");
            return { worker, score, reasons };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.score - a.score || a.worker.user_id.localeCompare(b.worker.user_id));

        const chosen = candidates[0] as any;
        if (!chosen) { missing += slots; break; }
        planned.push({ shift_id: shift.id, user_id: chosen.worker.user_id });
        next.push({
          shiftId: shift.id,
          shiftLabel: `${shift.shift_date} · ${shift.name} · ${shift.start_time.slice(0,5)}-${shift.end_time.slice(0,5)}`,
          userId: chosen.worker.user_id,
          workerName: workerName(chosen.worker.user_id),
          score: Math.round(chosen.score),
          reasons: chosen.reasons
        });
        slots -= 1;
      }
    }

    setSuggestions(next); setUnfilled(missing); setBusy("");
    setMessage(next.length ? `נוצרה הצעה ל-${next.length} שיבוצים חדשים.` : "לא נמצאו שיבוצים חדשים שאפשר להציע תחת המגבלות הנוכחיות.");
  }, [approvedLeave, availability, minRestHours, periods, submissions, supabase, templates, workerName, workers]);

  const apply = useCallback(async () => {
    if (!suggestions.length) return;
    const period = periods.find((p) => p.id === selectedPeriodId);
    if (!period || period.status === "published") {
      setSuggestions([]);
      setMessage("לא ניתן להחיל Smart Draft על סידור שפורסם. יש לבטל פרסום ולחשב הצעה מחדש.");
      return;
    }
    if (!window.confirm(`להחיל ${suggestions.length} שיבוצים מוצעים על הטיוטה? הפעולה לא מפרסמת את הסידור לצוות.`)) return;

    setBusy("apply"); setMessage("");
    const db = supabase as any;

    const [{ data: currentPeriod }, { data: periodShiftRows }] = await Promise.all([
      db.from("schedule_periods").select("id, status").eq("id", selectedPeriodId).single(),
      db.from("shifts").select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status").eq("schedule_period_id", selectedPeriodId).neq("status", "cancelled")
    ]);
    if (!currentPeriod || currentPeriod.status === "published") {
      setBusy(""); setSuggestions([]); setMessage("התקופה פורסמה מאז יצירת ההצעה. לא בוצע שינוי; בטל פרסום וחשב הצעה מחדש."); return;
    }

    const currentShifts = (periodShiftRows ?? []) as Shift[];
    const currentIds = currentShifts.map((s) => s.id);
    const { data: currentAssignmentsRows } = currentIds.length
      ? await db.from("shift_assignments").select("shift_id, user_id").in("shift_id", currentIds)
      : { data: [] };
    const currentAssignments = (currentAssignmentsRows ?? []) as Assignment[];

    for (const suggestion of suggestions) {
      const shift = currentShifts.find((s) => s.id === suggestion.shiftId);
      if (!shift || shift.status === "cancelled") {
        setBusy(""); setSuggestions([]); setMessage("אחת המשמרות השתנתה מאז יצירת ההצעה. לא בוצע שינוי; יש לחשב Smart Draft מחדש."); return;
      }
      if (currentAssignments.some((a) => a.shift_id === suggestion.shiftId && a.user_id === suggestion.userId)) {
        setBusy(""); setSuggestions([]); setMessage("השיבוצים השתנו מאז יצירת ההצעה. לא בוצע שינוי; יש לחשב Smart Draft מחדש."); return;
      }
      const currentCount = currentAssignments.filter((a) => a.shift_id === suggestion.shiftId).length;
      if (currentCount >= shift.required_employees) {
        setBusy(""); setSuggestions([]); setMessage("אחת המשמרות כבר מלאה. לא בוצע שינוי; יש לחשב Smart Draft מחדש."); return;
      }
    }

    const rows = suggestions.map((s) => ({ organization_id: organizationId, shift_id: s.shiftId, user_id: s.userId, assigned_by: currentUserId }));
    const { error } = await db.from("shift_assignments").insert(rows);
    setBusy("");
    if (error) { setMessage("החלת Smart Draft נכשלה. לא פורסם שום סידור; יש לרענן ולבדוק את הטיוטה."); return; }
    setMessage("Smart Draft הוחל על הטיוטה. מרענן את המסך...");
    window.location.reload();
  }, [currentUserId, organizationId, periods, selectedPeriodId, suggestions, supabase]);

  useEffect(() => {
    const sync = () => {
      const select = document.querySelector<HTMLSelectElement>(".schedule-period-select");
      setSelectedPeriodId(select?.value ?? periods[0]?.id ?? "");
      setSuggestions([]);
      setUnfilled(0);
    };
    sync();
    const root = document.querySelector(".schedule-workbench");
    root?.addEventListener("change", sync);
    return () => root?.removeEventListener("change", sync);
  }, [periods]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const published = selectedPeriod?.status === "published";

  return <section className="template-list-card no-print" aria-live="polite">
    <div className="template-list-heading">
      <div><p className="eyebrow">Phase 2 · Scheduling Intelligence</p><h2><WandSparkles size={20} /> Smart Draft</h2><p className="card-muted">מייצר הצעת שיבוץ מוסברת לפי זמינות, העדפות, מגבלות וכיסוי. שום דבר לא נשמר בלי אישור המנהל.</p></div>
      <div className="button-row">
        <button type="button" className="button" disabled={busy !== "" || !selectedPeriodId || published} onClick={() => void generate(selectedPeriodId)}>{busy === "plan" ? <Loader2 size={15} /> : <RefreshCw size={15} />} חשב הצעה</button>
        <button type="button" className="button primary" disabled={busy !== "" || !suggestions.length || published} onClick={() => void apply()}>{busy === "apply" ? <Loader2 size={15} /> : <Sparkles size={15} />} החל על הטיוטה</button>
      </div>
    </div>

    {published ? <div className="submission-banner"><div><strong>הסידור פורסם</strong><span>Smart Draft מושבת עד לביטול הפרסום כדי למנוע שינוי שיבוצים שכבר נשלחו לעובדים.</span></div></div> : null}
    {message ? <div className="submission-banner open"><CheckCircle2 size={18} /><div><strong>{message}</strong>{unfilled ? <span>{unfilled} מקומות נשארו ללא מועמד שעומד בכל המגבלות.</span> : null}</div></div> : null}

    {suggestions.length ? <div className="template-list" style={{ marginTop: 12 }}>{suggestions.slice(0, 20).map((s, index) => <article className="card" key={`${s.shiftId}-${s.userId}-${index}`}><div className="mini-row"><span><strong>{s.shiftLabel}</strong><small>{s.workerName} · ציון התאמה {s.score} · {s.reasons.join(" · ")}</small></span><span className="badge opening">הצעה בלבד</span></div></article>)}</div> : null}
    {suggestions.length > 20 ? <p className="card-muted">מוצגות 20 ההצעות הראשונות מתוך {suggestions.length}.</p> : null}
    <p className="card-muted" style={{ marginTop: 10 }}>Smart Draft לעולם לא מפרסם סידור. לפני החלה הוא מאמת מחדש שהתקופה עדיין טיוטה ושהמשמרות לא השתנו.</p>
  </section>;
}
