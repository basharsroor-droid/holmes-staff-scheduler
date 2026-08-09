"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, CopyPlus, FileDown, Loader2, Printer, Send, Sparkles, Undo2, UserPlus } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type AvailabilityStatus = Database["public"]["Enums"]["availability_status"];
type LeaveType = Database["public"]["Enums"]["leave_type"];
type Period = { id: string; branch_id: string; year: number; month: number; status: string; published_at: string | null };
type Branch = { id: string; name: string };
type Template = { id: string; branch_id: string; name: string; start_time: string; end_time: string; required_employees: number; requires_senior_employee: boolean };
type Worker = { id: string; user_id: string; branch_id: string | null; role: string; seniority_level: string; can_open: boolean; can_close: boolean; weekly_hours_limit: number | null; profile: { id: string; first_name: string; last_name: string; color: string } | null };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; status: string };
type Assignment = { id: string; shift_id: string; user_id: string };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: AvailabilityStatus };
type LeaveRequest = { id: string; user_id: string; leave_type: LeaveType; start_date: string; end_date: string };

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const availabilityLabels: Record<AvailabilityStatus, string> = { preferred: "מועדפת", available: "זמין/ה", only_if_needed: "רק אם צריך", unavailable: "לא זמין/ה" };
const leaveTypeLabels: Record<LeaveType, string> = { vacation: "בחופשה", sick: "במחלה" };

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ScheduleBuilderClient({ organizationId, currentUserId, periods, branches, templates, workers, shifts: initialShifts, assignments: initialAssignments, submissions, availability, leaveRequests }: {
  organizationId: string; currentUserId: string; periods: Period[]; branches: Branch[]; templates: Template[]; workers: Worker[]; shifts: Shift[]; assignments: Assignment[]; submissions: Submission[]; availability: Availability[]; leaveRequests: LeaveRequest[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [shifts, setShifts] = useState(initialShifts);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  // `periods` is server-rendered data passed in as a prop, so it never
  // reflects a publish/unpublish call made during this session without a
  // full page reload. Track just the status locally so the publish button,
  // the unpublish button, and the assignment controls stay in sync with
  // what actually happened.
  const [periodStatusOverrides, setPeriodStatusOverrides] = useState<Record<string, string>>({});
  const [duplicateSourceId, setDuplicateSourceId] = useState("");

  const period = periods.find((item) => item.id === selectedPeriodId);
  const periodStatus = period ? (periodStatusOverrides[period.id] ?? period.status) : undefined;
  const periodTemplates = period ? templates.filter((item) => item.branch_id === period.branch_id) : [];
  const periodWorkers = period ? workers.filter((item) => !item.branch_id || item.branch_id === period.branch_id) : [];
  const periodShifts = shifts.filter((item) => item.schedule_period_id === selectedPeriodId);
  // Only periods in the same branch that actually have shifts already are
  // useful duplication sources -- an empty period would just duplicate
  // nothing.
  const duplicateCandidates = period
    ? periods.filter((item) => item.branch_id === period.branch_id && item.id !== period.id && shifts.some((shift) => shift.schedule_period_id === item.id))
    : [];
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

  function workerLeave(userId: string, shift: Shift) {
    return leaveRequests.find((item) => item.user_id === userId && shift.shift_date >= item.start_date && shift.shift_date <= item.end_date) ?? null;
  }

  function shiftHours(shift: Shift) {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);
    let minutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (minutes <= 0) minutes += 24 * 60; // overnight shift, matches the overlap-prevention trigger's convention
    return minutes / 60;
  }

  // Sunday-Saturday, matching the Israeli work week. Only sums shifts within
  // the currently selected period -- a week that straddles a month boundary
  // undercounts the days that fall in the adjacent period, a known v1 gap.
  function weekStartKey(date: string) {
    const day = new Date(`${date}T12:00:00`);
    day.setDate(day.getDate() - day.getDay());
    return dateKey(day.getFullYear(), day.getMonth() + 1, day.getDate());
  }

  function weeklyHours(userId: string, weekKey: string) {
    return periodShifts
      .filter((item) => weekStartKey(item.shift_date) === weekKey && assignments.some((a) => a.shift_id === item.id && a.user_id === userId))
      .reduce((total, item) => total + shiftHours(item), 0);
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
    // Matches the real DB constraint (shifts_schedule_period_id_shift_date_name_key):
    // (schedule_period_id, shift_date, name) -- not shift_template_id, which has no
    // unique/exclusion constraint backing it and made every upsert here fail with a
    // PostgREST 400 ("no unique or exclusion constraint matching the ON CONFLICT
    // specification").
    const { data, error } = await supabase.from("shifts").upsert(rows, { onConflict: "schedule_period_id,shift_date,name" }).select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status");
    setBusy("");
    if (error || !data) { setMessage("יצירת משמרות החודש נכשלה. נסה שוב."); return; }
    setShifts((current) => [...current.filter((item) => item.schedule_period_id !== period.id), ...data]);
    setMessage(`נוצרו ${data.length} משמרות לחודש.`);
  }

  async function duplicateFromPrevious() {
    if (!period || !duplicateSourceId || periodShifts.length) return;
    setBusy("duplicate"); setMessage("");
    const { data, error } = await supabase.rpc("duplicate_schedule_period", {
      source_period_id: duplicateSourceId,
      target_period_id: period.id
    });
    if (error || !data || !data.length) {
      setBusy("");
      setMessage("שכפול הסידור נכשל.");
      return;
    }
    const result = data[0];
    // The RPC doesn't return the created rows themselves, only counts --
    // reload this period's shifts and their assignments from the DB
    // instead of trying to reconstruct them client-side.
    const { data: newShifts } = await supabase
      .from("shifts")
      .select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status")
      .eq("schedule_period_id", period.id);
    const newShiftIds = (newShifts ?? []).map((item) => item.id);
    const { data: newAssignments } = newShiftIds.length
      ? await supabase.from("shift_assignments").select("id, shift_id, user_id").in("shift_id", newShiftIds)
      : { data: [] };
    setBusy("");
    setShifts((current) => [...current.filter((item) => item.schedule_period_id !== period.id), ...(newShifts ?? [])]);
    setAssignments((current) => [...current.filter((item) => !newShiftIds.includes(item.shift_id)), ...(newAssignments ?? [])]);
    setMessage(`שוכפלו ${result.shifts_created} משמרות ו-${result.assignments_created} שיבוצים מהחודש שנבחר${result.assignments_skipped_inactive ? ` (${result.assignments_skipped_inactive} שיבוצים דולגו כי העובד/ת כבר לא פעיל/ה בארגון)` : ""}.`);
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
    const leave = workerLeave(userId, shift);
    if (leave) { setBusy(""); setMessage(`${workerName(userId)} ${leaveTypeLabels[leave.leave_type]} בתאריך הזה.`); return; }
    const limit = periodWorkers.find((item) => item.user_id === userId)?.weekly_hours_limit;
    if (limit) {
      const weekKey = weekStartKey(shift.shift_date);
      const projected = weeklyHours(userId, weekKey) + shiftHours(shift);
      // Soft cap, not a hard block -- legitimate overtime happens, so a
      // manager can confirm past it rather than being unable to schedule
      // someone at all.
      if (projected > limit && !window.confirm(`${workerName(userId)} יעבור/תעבור את מגבלת ${limit} השעות השבועית שלו/ה (יגיע/תגיע ל-${Math.round(projected * 10) / 10} שעות). לשבץ בכל זאת?`)) {
        setBusy("");
        return;
      }
    }
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
    const { error } = await supabase.rpc("publish_schedule_period", { target_period_id: period.id });
    setBusy("");
    if (error) { setMessage("פרסום הסידור נכשל. לא בוצע שינוי חלקי."); return; }
    setShifts((current) => current.map((item) => item.schedule_period_id === period.id ? { ...item, status: "published" } : item));
    setPeriodStatusOverrides((current) => ({ ...current, [period.id]: "published" }));
    setMessage("הסידור פורסם בהצלחה לצוות.");
  }

  async function unpublish() {
    if (!period) return;
    if (!window.confirm("ביטול הפרסום יחזיר את הסידור לטיוטה ויסתיר אותו מהעובדים עד שיפורסם מחדש. להמשיך?")) return;
    setBusy("unpublish"); setMessage("");
    const { error } = await supabase.rpc("unpublish_schedule_period", { target_period_id: period.id });
    setBusy("");
    if (error) { setMessage("ביטול הפרסום נכשל."); return; }
    setShifts((current) => current.map((item) => item.schedule_period_id === period.id ? { ...item, status: "draft" } : item));
    setPeriodStatusOverrides((current) => ({ ...current, [period.id]: "draft" }));
    setMessage("הפרסום בוטל. הסידור חזר לטיוטה ואינו גלוי לעובדים.");
  }

  function exportCsv() {
    if (!period || !periodShifts.length) return;
    const rows = [["תאריך", "יום", "משמרת", "שעת התחלה", "שעת סיום", "עובדים משובצים", "חסרים"]];
    for (const date of days) {
      const dayShifts = periodShifts.filter((shift) => shift.shift_date === date);
      for (const shift of dayShifts) {
        const assignedNames = assignments.filter((item) => item.shift_id === shift.id).map((item) => workerName(item.user_id));
        const weekday = new Date(`${date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long" });
        const missing = Math.max(0, shift.required_employees - assignedNames.length);
        rows.push([date, weekday, shift.name, shift.start_time.slice(0, 5), shift.end_time.slice(0, 5), assignedNames.join("; "), String(missing)]);
      }
    }
    // Cell values may contain commas or quotes (worker names, day names) --
    // escape properly rather than assuming plain text.
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    // Leading BOM (\uFEFF): without it, Excel guesses the wrong encoding
    // for the Hebrew text and shows mojibake instead of readable headers.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `סידור-${monthNames[period.month - 1]}-${period.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!periods.length) return <section className="template-list-card"><div className="empty-template-state"><CalendarRange size={42} /><h2>אין עדיין חודש עבודה</h2><p>פתח חודש עבודה לפני בניית הסידור.</p></div></section>;

  return <section className="template-list-card">
    <div className="no-print">
    <div className="template-list-heading"><div><p className="eyebrow">חודש וסניף</p><h2>{period ? `${monthNames[period.month - 1]} ${period.year}` : ""}</h2></div><select className="input" style={{ maxWidth: 300 }} value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>{periods.map((item) => <option value={item.id} key={item.id}>{monthNames[item.month - 1]} {item.year} · {branches.find((branch) => branch.id === item.branch_id)?.name ?? "סניף"}</option>)}</select></div>
    <div className="workspace-stats" style={{ margin: "0 0 20px" }}><article><CalendarRange /><span><strong>{periodShifts.length}</strong><small>משמרות בחודש</small></span></article><article><CheckCircle2 /><span><strong>{filled}</strong><small>משמרות מאוישות</small></span></article><article><UserPlus /><span><strong>{periodWorkers.length}</strong><small>עובדים לשיבוץ</small></span></article></div>
    <div className="actions" style={{ marginBottom: 18 }}><button className="button primary" disabled={!!busy || !periodTemplates.length} onClick={() => void generateMonth()}>{busy === "generate" ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} {periodShifts.length ? "סנכרון משמרות החודש" : "יצירת משמרות החודש"}</button>{periodStatus === "published" ? <button className="button" disabled={!!busy} onClick={() => void unpublish()}>{busy === "unpublish" ? <Loader2 className="spin" size={16} /> : <Undo2 size={16} />} ביטול פרסום</button> : <button className="button" disabled={!!busy || !periodShifts.length} onClick={() => void publish()}>{busy === "publish" ? <Loader2 className="spin" size={16} /> : <Send size={16} />} פרסום הסידור</button>}{periodShifts.length ? <button className="button" onClick={exportCsv}><FileDown size={16} /> ייצוא ל-Excel</button> : null}{periodShifts.length ? <button className="button" onClick={() => window.print()}><Printer size={16} /> הדפסה / PDF</button> : null}</div>
    {!periodShifts.length && duplicateCandidates.length
      ? <div className="actions" style={{ marginBottom: 18 }}>
          <select className="input" style={{ maxWidth: 260 }} value={duplicateSourceId} onChange={(event) => setDuplicateSourceId(event.target.value)}>
            <option value="">שכפול מחודש קודם...</option>
            {duplicateCandidates.map((item) => <option value={item.id} key={item.id}>{monthNames[item.month - 1]} {item.year}</option>)}
          </select>
          <button className="button" disabled={!!busy || !duplicateSourceId} onClick={() => void duplicateFromPrevious()}>{busy === "duplicate" ? <Loader2 className="spin" size={16} /> : <CopyPlus size={16} />} שכפול משמרות ושיבוצים</button>
        </div>
      : null}
    {!periodTemplates.length ? <div className="submission-banner closed"><AlertTriangle /><div><strong>אין סוגי משמרות פעילים בסניף</strong><span>יש להגדיר סוגי משמרות לפני יצירת הסידור.</span></div></div> : null}
    <div className="availability-board">{days.map((date) => {
      const dayShifts = periodShifts.filter((shift) => shift.shift_date === date);
      if (!dayShifts.length) return null;
      return <article className="availability-card" key={date}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}</strong>{dayShifts.map((shift) => {
        const assigned = assignments.filter((item) => item.shift_id === shift.id);
        return <div className="card-muted" key={shift.id}><div className="shift-title"><span>{shift.name}</span><small>{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)} · {assigned.length}/{shift.required_employees}</small></div><div className="grid">{periodWorkers.map((worker) => {
          const selected = assigned.some((item) => item.user_id === worker.user_id);
          const availabilityStatus = workerAvailability(worker.user_id, shift);
          const leave = workerLeave(worker.user_id, shift);
          return <button type="button" className={`button ${selected ? "primary" : ""}`} disabled={!!busy || periodStatus === "published" || availabilityStatus === "unavailable" || !!leave} onClick={() => void assign(shift, worker.user_id)} key={worker.user_id}><span>{workerName(worker.user_id)}</span><small>{leave ? leaveTypeLabels[leave.leave_type] : availabilityStatus ? availabilityLabels[availabilityStatus] : "לא הוגשה זמינות"}</small></button>;
        })}</div></div>;
      })}</article>;
    })}</div>
    {!periodShifts.length && periodTemplates.length ? <div className="empty-template-state"><CalendarRange size={38} /><p>לחץ על יצירת משמרות החודש כדי להתחיל לשבץ.</p></div> : null}
    {message ? <p className="auth-message" role="status">{message}</p> : null}
    </div>
    {period ? <div className="print-only">
      <h2>{monthNames[period.month - 1]} {period.year} · {branches.find((branch) => branch.id === period.branch_id)?.name ?? "סניף"}</h2>
      {days.map((date) => {
        const dayShifts = periodShifts.filter((shift) => shift.shift_date === date);
        if (!dayShifts.length) return null;
        return <div className="print-schedule-day" key={date}>
          <h3>{new Date(`${date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}</h3>
          {dayShifts.map((shift) => {
            const assignedNames = assignments.filter((item) => item.shift_id === shift.id).map((item) => workerName(item.user_id));
            return <div className="print-schedule-shift" key={shift.id}>
              <span><strong>{shift.name}</strong> {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}</span>
              <span className="names">{assignedNames.length ? assignedNames.join(", ") : "לא מאויש"}</span>
            </div>;
          })}
        </div>;
      })}
    </div> : null}
  </section>;
}
