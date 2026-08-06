"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Loader2, Send, Sparkles, UserPlus } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type AvailabilityStatus = Database["public"]["Enums"]["availability_status"];
type Period = { id: string; branch_id: string; year: number; month: number; status: string; published_at: string | null };
type Branch = { id: string; name: string };
type Template = { id: string; branch_id: string; name: string; start_time: string; end_time: string; required_employees: number; requires_senior_employee: boolean };
type Worker = { id: string; user_id: string; branch_id: string | null; role: string; seniority_level: string; can_open: boolean; can_close: boolean; profile: { id: string; first_name: string; last_name: string; color: string } | null };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; status: string };
type Assignment = { id: string; shift_id: string; user_id: string };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: AvailabilityStatus };

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const availabilityLabels: Record<AvailabilityStatus, string> = { preferred: "מועדפת", available: "זמין/ה", only_if_needed: "רק אם צריך", unavailable: "לא זמין/ה" };

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ScheduleBuilderClient({ organizationId, currentUserId, periods, branches, templates, workers, shifts: initialShifts, assignments: initialAssignments, submissions, availability }: {
  organizationId: string; currentUserId: string; periods: Period[]; branches: Branch[]; templates: Template[]; workers: Worker[]; shifts: Shift[]; assignments: Assignment[]; submissions: Submission[]; availability: Availability[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [shifts, setShifts] = useState(initialShifts);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const period = periods.find((item) => item.id === selectedPeriodId);
  const periodTemplates = period ? templates.filter((item) => item.branch_id === period.branch_id) : [];
  const periodWorkers = period ? workers.filter((item) => !item.branch_id || item.branch_id === period.branch_id) : [];
  const periodShifts = shifts.filter((item) => item.schedule_period_id === selectedPeriodId);
  const periodSubmissions = submissions.filter((item) => item.schedule_period_id === selectedPeriodId && item.submitted_at);
  const days = period ? Array.from({ length: new Date(period.year, period.month, 0).getDate() }, (_, index) => dateKey(period.year, period.month, index + 1)) : [];
  const filled = periodShifts.filter((shift) => assignments.filter((item) => item.shift_id === shift.id).length >= shift.required_employees).length;

  function workerName(userId: string) {
    const profile = periodWorkers.find((item) => item.user_id === userId)?.profile;
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "עובד/ת";
  }

  function workerAvailability(userId: string, shift: Shift) {
    const submission = periodSubmissions.find((item) => item.user_id === userId);
    if (!submission || !shift.shift_template_id) return null;
    return availability.find((item) => item.submission_id === submission.id && item.shift_date === shift.shift_date && item.shift_template_id === shift.shift_template_id)?.status ?? null;
  }

  function hasConflict(userId: string, shift: Shift) {
    return periodShifts.some((other) => other.id !== shift.id && other.shift_date === shift.shift_date && assignments.some((item) => item.shift_id === other.id && item.user_id === userId) && other.start_time < shift.end_time && shift.start_time < other.end_time);
  }

  async function generateMonth() {
    if (!period || !periodTemplates.length) return;
    setBusy("generate"); setMessage("");
    const rows = days.flatMap((shiftDate) => periodTemplates.map((template) => ({
      organization_id: organizationId,
      schedule_period_id: period.id,
      shift_template_id: template.id,
      shift_date: shiftDate,
      name: template.name,
      start_time: template.start_time,
      end_time: template.end_time,
      required_employees: template.required_employees,
      status: "draft" as const
    })));
    const { data, error } = await supabase.from("shifts").upsert(rows, { onConflict: "schedule_period_id,shift_date,shift_template_id" }).select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status");
    setBusy("");
    if (error || !data) { setMessage("יצירת משמרות החודש נכשלה. נסה שוב."); return; }
    setShifts((current) => [...current.filter((item) => item.schedule_period_id !== period.id), ...data]);
    setMessage(`נוצרו ${data.length} משמרות לחודש.`);
  }

  async function assign(shift: Shift, userId: string) {
    setBusy(shift.id); setMessage("");
    const existing = assignments.find((item) => item.shift_id === shift.id && item.user_id === userId);
    if (existing) {
      const { error } = await supabase.from("shift_assignments").delete().eq("id", existing.id);
      setBusy("");
      if (error) { setMessage("הסרת השיבוץ נכשלה."); return; }
      setAssignments((current) => current.filter((item) => item.id !== existing.id));
      return;
    }
    if (hasConflict(userId, shift)) { setBusy(""); setMessage(`${workerName(userId)} כבר משובץ/ת במשמרת חופפת.`); return; }
    const status = workerAvailability(userId, shift);
    if (status === "unavailable") { setBusy(""); setMessage(`${workerName(userId)} סימן/ה שאינו/ה זמין/ה למשמרת הזאת.`); return; }
    const { data, error } = await supabase.from("shift_assignments").insert({ organization_id: organizationId, shift_id: shift.id, user_id: userId, assigned_by: currentUserId }).select("id, shift_id, user_id").single();
    setBusy("");
    if (error || !data) { setMessage("שמירת השיבוץ נכשלה."); return; }
    setAssignments((current) => [...current, data]);
  }

  async function publish() {
    if (!period || !periodShifts.length) return;
    const missing = periodShifts.filter((shift) => assignments.filter((item) => item.shift_id === shift.id).length < shift.required_employees).length;
    if (missing && !window.confirm(`עדיין חסרים עובדים ב-${missing} משמרות. לפרסם בכל זאת?`)) return;
    setBusy("publish"); setMessage("");
    const now = new Date().toISOString();
    const [{ error: shiftsError }, { error: periodError }] = await Promise.all([
      supabase.from("shifts").update({ status: "published" }).eq("schedule_period_id", period.id),
      supabase.from("schedule_periods").update({ status: "published", published_at: now }).eq("id", period.id)
    ]);
    setBusy("");
    if (shiftsError || periodError) { setMessage("פרסום הסידור נכשל."); return; }
    setShifts((current) => current.map((item) => item.schedule_period_id === period.id ? { ...item, status: "published" } : item));
    setMessage("הסידור פורסם בהצלחה לצוות.");
  }

  if (!periods.length) return <section className="template-list-card"><div className="empty-template-state"><CalendarRange size={42} /><h2>אין עדיין חודש עבודה</h2><p>פתח חודש עבודה לפני בניית הסידור.</p></div></section>;

  return <section className="template-list-card">
    <div className="template-list-heading"><div><p className="eyebrow">חודש וסניף</p><h2>{period ? `${monthNames[period.month - 1]} ${period.year}` : ""}</h2></div><select className="input" style={{ maxWidth: 300 }} value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>{periods.map((item) => <option value={item.id} key={item.id}>{monthNames[item.month - 1]} {item.year} · {branches.find((branch) => branch.id === item.branch_id)?.name ?? "סניף"}</option>)}</select></div>
    <div className="workspace-stats" style={{ margin: "0 0 20px" }}><article><CalendarRange /><span><strong>{periodShifts.length}</strong><small>משמרות בחודש</small></span></article><article><CheckCircle2 /><span><strong>{filled}</strong><small>משמרות מאוישות</small></span></article><article><UserPlus /><span><strong>{periodWorkers.length}</strong><small>עובדים לשיבוץ</small></span></article></div>
    <div className="actions" style={{ marginBottom: 18 }}><button className="button primary" disabled={!!busy || !periodTemplates.length} onClick={() => void generateMonth()}>{busy === "generate" ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} {periodShifts.length ? "סנכרון משמרות החודש" : "יצירת משמרות החודש"}</button><button className="button" disabled={!!busy || !periodShifts.length || period?.status === "published"} onClick={() => void publish()}>{busy === "publish" ? <Loader2 className="spin" size={16} /> : <Send size={16} />} פרסום הסידור</button></div>
    {!periodTemplates.length ? <div className="submission-banner closed"><AlertTriangle /><div><strong>אין סוגי משמרות פעילים בסניף</strong><span>יש להגדיר סוגי משמרות לפני יצירת הסידור.</span></div></div> : null}
    <div className="availability-board">{days.map((date) => {
      const dayShifts = periodShifts.filter((shift) => shift.shift_date === date);
      if (!dayShifts.length) return null;
      return <article className="availability-card" key={date}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}</strong>{dayShifts.map((shift) => {
        const assigned = assignments.filter((item) => item.shift_id === shift.id);
        return <div className="card-muted" key={shift.id}><div className="shift-title"><span>{shift.name}</span><small>{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)} · {assigned.length}/{shift.required_employees}</small></div><div className="grid">{periodWorkers.map((worker) => {
          const selected = assigned.some((item) => item.user_id === worker.user_id);
          const availabilityStatus = workerAvailability(worker.user_id, shift);
          return <button type="button" className={`button ${selected ? "primary" : ""}`} disabled={!!busy || period?.status === "published" || availabilityStatus === "unavailable"} onClick={() => void assign(shift, worker.user_id)} key={worker.user_id}><span>{workerName(worker.user_id)}</span><small>{availabilityStatus ? availabilityLabels[availabilityStatus] : "לא הוגשה זמינות"}</small></button>;
        })}</div></div>;
      })}</article>;
    })}</div>
    {!periodShifts.length && periodTemplates.length ? <div className="empty-template-state"><CalendarRange size={38} /><p>לחץ על יצירת משמרות החודש כדי להתחיל לשבץ.</p></div> : null}
    {message ? <p className="auth-message" role="status">{message}</p> : null}
  </section>;
}
