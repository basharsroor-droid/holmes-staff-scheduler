"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Period = { id: string; department_id: string; year: number; month: number; status: string };
type Worker = { user_id: string; department_ids: string[]; seniority_level: string; weekly_hours_limit: number | null; profile: { first_name: string; last_name: string } | null };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };
type Leave = { user_id: string; start_date: string; end_date: string };
type Template = { id: string; requires_senior_employee: boolean };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; status: string };
type Assignment = { id: string; shift_id: string; user_id: string };
type Candidate = { userId: string; name: string; score: number; reasons: string[] };

function shiftHours(shift: Shift) {
  const [startH, startM] = shift.start_time.split(":").map(Number);
  const [endH, endM] = shift.end_time.split(":").map(Number);
  let minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes <= 0) minutes += 1440;
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

export function SmartReplacementPanel({ organizationId, currentUserId, periods, workers, submissions, availability, approvedLeave, templates, minRestHours }: {
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
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [outgoingUserId, setOutgoingUserId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<"load" | "rank" | "apply" | "">("");
  const [message, setMessage] = useState("");

  const workerName = useCallback((userId: string) => {
    const p = workers.find((w) => w.user_id === userId)?.profile;
    return p ? `${p.first_name} ${p.last_name}`.trim() : "עובד/ת";
  }, [workers]);

  const loadPeriod = useCallback(async (periodId: string) => {
    setBusy("load"); setMessage(""); setCandidates([]); setSelectedShiftId(""); setOutgoingUserId("");
    const db = supabase as any;
    const { data: shiftRows } = await db.from("shifts")
      .select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status")
      .eq("schedule_period_id", periodId).neq("status", "cancelled").order("shift_date").order("start_time");
    const nextShifts = (shiftRows ?? []) as Shift[];
    const ids = nextShifts.map((s) => s.id);
    const { data: assignmentRows } = ids.length
      ? await db.from("shift_assignments").select("id, shift_id, user_id").in("shift_id", ids)
      : { data: [] };
    setShifts(nextShifts); setAssignments((assignmentRows ?? []) as Assignment[]); setBusy("");
  }, [supabase]);

  const rank = useCallback(async () => {
    const period = periods.find((p) => p.id === selectedPeriodId);
    const shift = shifts.find((s) => s.id === selectedShiftId);
    if (!period || !shift || !outgoingUserId) return;
    if (period.status === "published") {
      setCandidates([]); setMessage("Smart Replacement עובד על טיוטה בלבד. יש לבטל פרסום לפני שינוי שיבוצים."); return;
    }
    setBusy("rank"); setMessage(""); setCandidates([]);
    const db = supabase as any;
    const { data: allShiftRows } = await db.from("shifts")
      .select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status")
      .neq("status", "cancelled");
    const allShifts = (allShiftRows ?? []) as Shift[];
    const allIds = allShifts.map((s) => s.id);
    const { data: allAssignmentRows } = allIds.length
      ? await db.from("shift_assignments").select("id, shift_id, user_id").in("shift_id", allIds)
      : { data: [] };
    const allAssignments = (allAssignmentRows ?? []) as Assignment[];
    const periodWorkers = workers.filter((w) => w.department_ids.includes(period.department_id));
    const targetAssignments = allAssignments.filter((a) => a.shift_id === shift.id);
    if (!targetAssignments.some((a) => a.user_id === outgoingUserId)) {
      setBusy(""); setMessage("השיבוץ שנבחר השתנה מאז טעינת המסך. רעננתי את הרשימה כדי למנוע החלפה על מידע ישן."); await loadPeriod(selectedPeriodId); return;
    }

    const availabilityStatus = (userId: string) => {
      const sub = submissions.find((s) => s.schedule_period_id === selectedPeriodId && s.user_id === userId && s.submitted_at);
      if (!sub || !shift.shift_template_id) return null;
      return availability.find((a) => a.submission_id === sub.id && a.shift_date === shift.shift_date && a.shift_template_id === shift.shift_template_id)?.status ?? null;
    };
    const week = weekStartKey(shift.shift_date);
    const weeklyHours = (userId: string) => allShifts.filter((s) => weekStartKey(s.shift_date) === week && allAssignments.some((a) => a.shift_id === s.id && a.user_id === userId)).reduce((sum, s) => sum + shiftHours(s), 0);
    const totalHours = (userId: string) => allShifts.filter((s) => allAssignments.some((a) => a.shift_id === s.id && a.user_id === userId)).reduce((sum, s) => sum + shiftHours(s), 0);
    const minGap = (userId: string) => {
      const c = bounds(shift); let gap = Infinity;
      for (const other of allShifts) {
        if (other.id === shift.id || !allAssignments.some((a) => a.shift_id === other.id && a.user_id === userId)) continue;
        const b = bounds(other);
        if (b.end <= c.start) gap = Math.min(gap, (c.start.getTime() - b.end.getTime()) / 3600000);
        else if (b.start >= c.end) gap = Math.min(gap, (b.start.getTime() - c.end.getTime()) / 3600000);
      }
      return gap;
    };

    const template = templates.find((t) => t.id === shift.shift_template_id);
    const otherAssignedUserIds = targetAssignments.filter((a) => a.user_id !== outgoingUserId).map((a) => a.user_id);
    const hasOtherSenior = otherAssignedUserIds.some((id) => periodWorkers.find((w) => w.user_id === id)?.seniority_level === "senior");
    const outgoingIsSenior = periodWorkers.find((w) => w.user_id === outgoingUserId)?.seniority_level === "senior";
    const replacementMustBeSenior = !!template?.requires_senior_employee && !!outgoingIsSenior && !hasOtherSenior;

    const ranked = periodWorkers.map((worker) => {
      if (worker.user_id === outgoingUserId || targetAssignments.some((a) => a.user_id === worker.user_id)) return null;
      if (replacementMustBeSenior && worker.seniority_level !== "senior") return null;
      const status = availabilityStatus(worker.user_id);
      if (!status || status === "unavailable") return null;
      if (approvedLeave.some((l) => l.user_id === worker.user_id && shift.shift_date >= l.start_date && shift.shift_date <= l.end_date)) return null;
      if (allShifts.some((other) => other.id !== shift.id && allAssignments.some((a) => a.shift_id === other.id && a.user_id === worker.user_id) && overlaps(other, shift))) return null;
      if (worker.weekly_hours_limit && weeklyHours(worker.user_id) + shiftHours(shift) > worker.weekly_hours_limit) return null;
      if (minRestHours && minGap(worker.user_id) < minRestHours) return null;

      const reasons: string[] = [];
      let score = 50;
      if (status === "preferred") { score += 35; reasons.push("משמרת מועדפת"); }
      else if (status === "available") { score += 25; reasons.push("זמין/ה למשמרת"); }
      else { score += 5; reasons.push("זמין/ה רק אם צריך"); }
      const hours = totalHours(worker.user_id);
      score -= Math.min(25, hours / 4);
      reasons.push(`${Math.round(hours * 10) / 10} שעות משובצות כרגע`);
      if (worker.seniority_level === "senior") { score += 3; reasons.push("עובד/ת בכיר/ה"); }
      if (replacementMustBeSenior) reasons.push("שומר/ת על דרישת Senior במשמרת");
      reasons.push("ללא חפיפה, Time Off או חריגת מנוחה/שעות");
      return { userId: worker.user_id, name: workerName(worker.user_id), score: Math.round(score), reasons };
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score || a.userId.localeCompare(b.userId)) as Candidate[];

    setCandidates(ranked); setBusy("");
    setMessage(ranked.length ? `נמצאו ${ranked.length} מחליפים בטוחים. המועמד המוביל מדורג לפי זמינות, העדפות, מגבלות ו-Fairness.` : "לא נמצא מחליף שעומד בכל המגבלות הנוכחיות.");
  }, [approvedLeave, availability, loadPeriod, minRestHours, outgoingUserId, periods, selectedPeriodId, selectedShiftId, shifts, submissions, supabase, templates, workerName, workers]);

  const apply = useCallback(async (candidate: Candidate) => {
    const period = periods.find((p) => p.id === selectedPeriodId);
    const shift = shifts.find((s) => s.id === selectedShiftId);
    if (!period || !shift || !outgoingUserId || period.status === "published") return;
    if (!window.confirm(`להחליף את ${workerName(outgoingUserId)} ב-${candidate.name} במשמרת ${shift.shift_date} ${shift.name}? הפעולה אינה מפרסמת את הסידור.`)) return;
    setBusy("apply"); setMessage("");
    const db = supabase as any;
    const { data: currentRows } = await db.from("shift_assignments").select("id, user_id").eq("shift_id", shift.id);
    const current = (currentRows ?? []) as { id: string; user_id: string }[];
    if (!current.some((a) => a.user_id === outgoingUserId) || current.some((a) => a.user_id === candidate.userId)) {
      setBusy(""); setMessage("השיבוץ השתנה מאז הדירוג. לא בוצע שינוי; יש לחשב מועמדים מחדש."); return;
    }
    const { error: removeError } = await db.from("shift_assignments").delete().eq("shift_id", shift.id).eq("user_id", outgoingUserId);
    if (removeError) { setBusy(""); setMessage("ההחלפה נכשלה לפני הסרת העובד/ת המקורי/ת. לא פורסם שום שינוי."); return; }
    const { error: addError } = await db.from("shift_assignments").insert({ organization_id: organizationId, shift_id: shift.id, user_id: candidate.userId, assigned_by: currentUserId });
    if (addError) {
      await db.from("shift_assignments").insert({ organization_id: organizationId, shift_id: shift.id, user_id: outgoingUserId, assigned_by: currentUserId });
      setBusy(""); setMessage("הוספת המחליף נכשלה. ניסיתי לשחזר את השיבוץ המקורי; יש לרענן ולבדוק את הטיוטה."); return;
    }
    setMessage("ההחלפה בוצעה בטיוטה. מרענן את הסידור...");
    window.location.reload();
  }, [currentUserId, organizationId, outgoingUserId, periods, selectedPeriodId, selectedShiftId, shifts, supabase, workerName]);

  useEffect(() => {
    const sync = () => {
      const select = document.querySelector<HTMLSelectElement>(".schedule-period-select");
      const next = select?.value ?? periods[0]?.id ?? "";
      if (next && next !== selectedPeriodId) setSelectedPeriodId(next);
    };
    sync();
    const root = document.querySelector(".schedule-workbench");
    root?.addEventListener("change", sync);
    return () => root?.removeEventListener("change", sync);
  }, [periods, selectedPeriodId]);

  useEffect(() => { if (selectedPeriodId) void loadPeriod(selectedPeriodId); }, [loadPeriod, selectedPeriodId]);

  const shiftAssignments = assignments.filter((a) => a.shift_id === selectedShiftId);
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return <section className="template-list-card no-print" aria-live="polite">
    <div className="template-list-heading">
      <div><p className="eyebrow">Phase 3 · WOW Features</p><h2><ArrowLeftRight size={20} /> Smart Replacement</h2><p className="card-muted">בחר/י עובד/ת משובץ/ת והמערכת תדרג מחליפים בטוחים עם הסבר ברור. שום החלפה לא מתבצעת בלי אישור מפורש.</p></div>
      <button type="button" className="button" disabled={busy !== "" || !selectedShiftId || !outgoingUserId} onClick={() => void rank()}>{busy === "rank" ? <Loader2 size={15} /> : <RefreshCw size={15} />} דרג מחליפים</button>
    </div>

    <div className="form-grid" style={{ marginTop: 12 }}>
      <label>משמרת<select value={selectedShiftId} onChange={(e) => { setSelectedShiftId(e.target.value); setOutgoingUserId(""); setCandidates([]); setMessage(""); }} disabled={busy === "load"}><option value="">בחר משמרת</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_date} · {s.name} · {s.start_time.slice(0,5)}-{s.end_time.slice(0,5)}</option>)}</select></label>
      <label>עובד/ת להחלפה<select value={outgoingUserId} onChange={(e) => { setOutgoingUserId(e.target.value); setCandidates([]); setMessage(""); }} disabled={!selectedShiftId}><option value="">בחר עובד/ת</option>{shiftAssignments.map((a) => <option key={a.id} value={a.user_id}>{workerName(a.user_id)}</option>)}</select></label>
    </div>

    {selectedPeriod?.status === "published" ? <div className="submission-banner"><ShieldCheck size={18} /><div><strong>התקופה מפורסמת</strong><span>Smart Replacement לא משנה סידור שכבר פורסם. בטל/י פרסום לפני החלפה.</span></div></div> : null}
    {message ? <div className="submission-banner open"><CheckCircle2 size={18} /><div><strong>{message}</strong></div></div> : null}

    {candidates.length ? <div className="template-list" style={{ marginTop: 12 }}>{candidates.slice(0, 10).map((candidate, index) => <article className="card" key={candidate.userId}><div className="mini-row"><span><strong>#{index + 1} · {candidate.name} · ציון {candidate.score}</strong><small>{candidate.reasons.join(" · ")}</small></span><button type="button" className="button primary" disabled={busy !== ""} onClick={() => void apply(candidate)}>{busy === "apply" ? <Loader2 size={14} /> : <ArrowLeftRight size={14} />} החלף</button></div></article>)}</div> : null}
    <p className="card-muted" style={{ marginTop: 10 }}>Smart Replacement מדרג רק מועמדים שעומדים במגבלות הקשות. ההחלפה נשמרת בטיוטה בלבד ולעולם אינה מפרסמת סידור אוטומטית.</p>
  </section>;
}
