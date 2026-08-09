"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, Loader2, Palmtree, Save, Send, Trash2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type AvailabilityStatus = Database["public"]["Enums"]["availability_status"];
type LeaveType = Database["public"]["Enums"]["leave_type"];
type Period = { id: string; year: number; month: number; status: string; submission_opens_at: string; submission_closes_at: string };
type Template = { id: string; name: string; start_time: string; end_time: string };
type Submission = { id: string; schedule_period_id: string; submitted_at: string | null; manager_note: string | null };
type Entry = { id: string; submission_id: string; shift_template_id: string; shift_date: string; status: AvailabilityStatus; note: string | null };
type LeaveRequest = { id: string; leave_type: LeaveType; start_date: string; end_date: string; note: string | null };
type Choice = { status: AvailabilityStatus | ""; note: string };

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const statusLabels: Record<AvailabilityStatus, string> = {
  preferred: "מועדפת", available: "זמין/ה", only_if_needed: "רק אם צריך", unavailable: "לא זמין/ה"
};
const leaveTypeLabels: Record<LeaveType, string> = { vacation: "חופשה", sick: "מחלה" };

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AvailabilityClient({ organizationId, userId, periods, templates, submissions, entries, leaveRequests: initialLeaveRequests }: {
  organizationId: string; userId: string; periods: Period[]; templates: Template[]; submissions: Submission[]; entries: Entry[]; leaveRequests: LeaveRequest[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);
  const [leaveForm, setLeaveForm] = useState<{ leaveType: LeaveType; startDate: string; endDate: string; note: string }>({ leaveType: "vacation", startDate: "", endDate: "", note: "" });
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");
  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const submissionIds = new Set(submissions.map((submission) => submission.id));
    return Object.fromEntries(entries.filter((entry) => submissionIds.has(entry.submission_id)).map((entry) => [`${entry.shift_date}|${entry.shift_template_id}`, { status: entry.status, note: entry.note ?? "" }]));
  });
  const [submittedByPeriod, setSubmittedByPeriod] = useState<Record<string, string | null>>(() => Object.fromEntries(submissions.map((item) => [item.schedule_period_id, item.submitted_at])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const period = periods.find((item) => item.id === selectedPeriodId);
  const days = useMemo(() => period ? Array.from({ length: new Date(period.year, period.month, 0).getDate() }, (_, index) => index + 1) : [], [period]);
  const deadlinePassed = period ? new Date(period.submission_closes_at) < new Date() : false;
  const notOpened = period ? new Date(period.submission_opens_at) > new Date() : false;

  function updateChoice(key: string, patch: Partial<Choice>) {
    setChoices((current) => ({ ...current, [key]: { status: current[key]?.status ?? "", note: current[key]?.note ?? "", ...patch } }));
  }

  async function ensureSubmission() {
    if (!period) return null;
    const existing = submissions.find((item) => item.schedule_period_id === period.id);
    if (existing) return existing.id;
    const { data, error } = await supabase.from("availability_submissions").insert({
      organization_id: organizationId, schedule_period_id: period.id, user_id: userId
    }).select("id").single();
    if (error || !data) return null;
    submissions.push({ id: data.id, schedule_period_id: period.id, submitted_at: null, manager_note: null });
    return data.id;
  }

  async function save(finalSubmit: boolean) {
    if (!period || deadlinePassed || notOpened) return;
    setBusy(true); setMessage("");
    const submissionId = await ensureSubmission();
    if (!submissionId) { setBusy(false); setMessage("לא הצלחנו לפתוח את טופס הזמינות."); return; }

    const periodPrefix = `${period.year}-${String(period.month).padStart(2, "0")}-`;
    const selected = Object.entries(choices).filter(([key, choice]) => key.startsWith(periodPrefix) && choice.status);
    if (finalSubmit && !selected.length) { setBusy(false); setMessage("יש לסמן לפחות משמרת אחת לפני השליחה."); return; }

    const rows = selected.map(([key, choice]) => {
      const [shift_date, shift_template_id] = key.split("|");
      return { organization_id: organizationId, submission_id: submissionId, shift_template_id, shift_date, status: choice.status as AvailabilityStatus, note: choice.note.trim() || null };
    });
    if (rows.length) {
      const { error } = await supabase.from("availability_entries").upsert(rows, { onConflict: "submission_id,shift_date,shift_template_id" });
      if (error) { setBusy(false); setMessage("שמירת הזמינות נכשלה."); return; }
    }

    const submittedAt = finalSubmit ? new Date().toISOString() : null;
    const { error } = await supabase.from("availability_submissions").update({ submitted_at: submittedAt }).eq("id", submissionId).eq("user_id", userId);
    setBusy(false);
    if (error) { setMessage("לא הצלחנו לעדכן את מצב ההגשה."); return; }
    setSubmittedByPeriod((current) => ({ ...current, [period.id]: submittedAt }));
    setMessage(finalSubmit ? "הזמינות נשלחה למנהל בהצלחה." : "הטיוטה נשמרה.");
  }

  async function addLeaveRequest() {
    setLeaveMessage("");
    if (!leaveForm.startDate || !leaveForm.endDate) { setLeaveMessage("יש לבחור תאריך התחלה וסיום."); return; }
    if (leaveForm.endDate < leaveForm.startDate) { setLeaveMessage("תאריך הסיום חייב להיות אחרי תאריך ההתחלה."); return; }
    setLeaveBusy(true);
    const { data, error } = await supabase
      .from("leave_requests")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        leave_type: leaveForm.leaveType,
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        note: leaveForm.note.trim() || null
      })
      .select("id, leave_type, start_date, end_date, note")
      .single();
    setLeaveBusy(false);
    if (error || !data) { setLeaveMessage("לא הצלחנו לשמור את הבקשה."); return; }
    setLeaveRequests((current) => [data, ...current]);
    setLeaveForm({ leaveType: "vacation", startDate: "", endDate: "", note: "" });
    setLeaveMessage("הבקשה נשמרה. המנהל יראה אותה בבניית הסידור.");
  }

  async function removeLeaveRequest(id: string) {
    setLeaveBusy(true); setLeaveMessage("");
    const { error } = await supabase.from("leave_requests").delete().eq("id", id).eq("user_id", userId);
    setLeaveBusy(false);
    if (error) { setLeaveMessage("ביטול הבקשה נכשל."); return; }
    setLeaveRequests((current) => current.filter((item) => item.id !== id));
  }

  const leaveCard = <section className="template-form-card">
    <div><p className="eyebrow">חופשה ומחלה</p><h2>דיווח על ימי היעדרות</h2></div>
    <p className="auth-secondary">דיווח כאן חוסם שיבוץ אוטומטית בבניית הסידור בטווח התאריכים שנבחר, בלי קשר לתקופת ההגשה.</p>
    <div className="form-pair">
      <label className="field"><span>סוג</span><select className="input" value={leaveForm.leaveType} onChange={(e) => setLeaveForm((c) => ({ ...c, leaveType: e.target.value as LeaveType }))}>{Object.entries(leaveTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>הערה אופציונלית</span><input className="input" value={leaveForm.note} onChange={(e) => setLeaveForm((c) => ({ ...c, note: e.target.value }))} /></label>
    </div>
    <div className="form-pair">
      <label className="field"><span>מתאריך</span><input className="input" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((c) => ({ ...c, startDate: e.target.value }))} /></label>
      <label className="field"><span>עד תאריך</span><input className="input" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((c) => ({ ...c, endDate: e.target.value }))} /></label>
    </div>
    <button className="button primary" disabled={leaveBusy} onClick={() => void addLeaveRequest()}>{leaveBusy ? <Loader2 className="spin" size={17} /> : <Palmtree size={17} />} שליחת בקשה</button>
    {leaveMessage ? <p className="auth-message" role="status">{leaveMessage}</p> : null}
    {leaveRequests.length
      ? <div className="template-list">{leaveRequests.map((item) => <article className="template-item" key={item.id}>
          <div className="template-main"><strong>{leaveTypeLabels[item.leave_type]}</strong><span>{new Date(`${item.start_date}T12:00:00`).toLocaleDateString("he-IL")} – {new Date(`${item.end_date}T12:00:00`).toLocaleDateString("he-IL")}{item.note ? ` · ${item.note}` : ""}</span></div>
          <button className="button danger" disabled={leaveBusy} onClick={() => void removeLeaveRequest(item.id)}><Trash2 size={15} /> ביטול</button>
        </article>)}</div>
      : null}
  </section>;

  if (!periods.length) return <div className="template-workbench">
    {leaveCard}
    <section className="template-list-card"><div className="empty-template-state"><CalendarCheck size={42} /><h2>אין כרגע חודש פתוח להגשה</h2><p>המנהל עדיין לא פתח תקופת זמינות חדשה.</p></div></section>
  </div>;

  return <div className="template-workbench">
    {leaveCard}
    <section className="template-list-card">
    <div className="template-list-heading"><div><p className="eyebrow">תקופת הגשה</p><h2>{period ? `${monthNames[period.month - 1]} ${period.year}` : ""}</h2></div><select className="input" style={{ maxWidth: 240 }} value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}>{periods.map((item) => <option value={item.id} key={item.id}>{monthNames[item.month - 1]} {item.year}</option>)}</select></div>
    {period ? <div className={`submission-banner ${deadlinePassed ? "closed" : "open"}`}><Clock3 /><div><strong>{notOpened ? "ההגשה טרם נפתחה" : deadlinePassed ? "מועד ההגשה הסתיים" : submittedByPeriod[period.id] ? "הזמינות נשלחה" : "ההגשה פתוחה"}</strong><span>דדליין: {new Date(period.submission_closes_at).toLocaleString("he-IL")}</span></div></div> : null}
    <div className="availability-board">
      {days.map((day) => {
        if (!period) return null;
        const date = dateKey(period.year, period.month, day);
        const label = new Date(`${date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" });
        return <article className="availability-card" key={date}><strong>{label}</strong>
          {templates.map((template) => {
            const key = `${date}|${template.id}`; const choice = choices[key] ?? { status: "", note: "" };
            return <div className="card-muted" key={template.id}><div className="shift-title"><span>{template.name}</span><small>{template.start_time.slice(0,5)}–{template.end_time.slice(0,5)}</small></div>
              <select className="input" disabled={deadlinePassed || notOpened} value={choice.status} onChange={(e) => updateChoice(key, { status: e.target.value as AvailabilityStatus | "" })}><option value="">לא סומן</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              {choice.status ? <input className="input" disabled={deadlinePassed || notOpened} placeholder="הערה אופציונלית" value={choice.note} onChange={(e) => updateChoice(key, { note: e.target.value })} /> : null}
            </div>;
          })}
        </article>;
      })}
    </div>
    <div className="actions" style={{ marginTop: 20 }}><button className="button" disabled={busy || deadlinePassed || notOpened} onClick={() => void save(false)}>{busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} שמירת טיוטה</button><button className="button primary" disabled={busy || deadlinePassed || notOpened} onClick={() => void save(true)}>{busy ? <Loader2 className="spin" size={17} /> : submittedByPeriod[period?.id ?? ""] ? <CheckCircle2 size={17} /> : <Send size={17} />} {submittedByPeriod[period?.id ?? ""] ? "עדכון ושליחה מחדש" : "שליחה למנהל"}</button></div>
    {message ? <p className="auth-message" role="status">{message}</p> : null}
    </section>
  </div>;
}
