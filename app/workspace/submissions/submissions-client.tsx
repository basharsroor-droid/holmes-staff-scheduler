"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock3, Loader2, Save, UserRound, Users, XCircle } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type AvailabilityStatus = Database["public"]["Enums"]["availability_status"];
type Period = { id: string; branch_id: string; year: number; month: number; status: string; submission_closes_at: string };
type Worker = { id: string; user_id: string; branch_id: string | null; role: string; profile: { id: string; first_name: string; last_name: string; color: string } | null };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null; manager_note: string | null; updated_at: string };
type Entry = { id: string; submission_id: string; shift_template_id: string; shift_date: string; status: AvailabilityStatus; note: string | null };
type Template = { id: string; name: string; start_time: string; end_time: string };
type Branch = { id: string; name: string };

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const statusLabels: Record<AvailabilityStatus, string> = { preferred: "מועדפת", available: "זמין/ה", only_if_needed: "רק אם צריך", unavailable: "לא זמין/ה" };

export function SubmissionsClient({ periods, workers, submissions: initialSubmissions, entries, templates, branches }: {
  periods: Period[]; workers: Worker[]; submissions: Submission[]; entries: Entry[]; templates: Template[]; branches: Branch[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | "submitted" | "draft" | "missing">("all");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialSubmissions.map((item) => [item.id, item.manager_note ?? ""])));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const period = periods.find((item) => item.id === selectedPeriodId);
  const periodWorkers = period ? workers.filter((worker) => !worker.branch_id || worker.branch_id === period.branch_id) : [];
  const periodSubmissions = submissions.filter((item) => item.schedule_period_id === selectedPeriodId);
  const submittedCount = periodSubmissions.filter((item) => item.submitted_at).length;
  const draftCount = periodSubmissions.filter((item) => !item.submitted_at).length;
  const missingCount = Math.max(0, periodWorkers.length - periodSubmissions.length);

  function workerState(worker: Worker) {
    const submission = periodSubmissions.find((item) => item.user_id === worker.user_id);
    return { submission, state: !submission ? "missing" : submission.submitted_at ? "submitted" : "draft" };
  }

  const visibleWorkers = periodWorkers.filter((worker) => filter === "all" || workerState(worker).state === filter);

  async function saveManagerNote(submission: Submission) {
    setBusyId(submission.id); setMessage("");
    const managerNote = notes[submission.id]?.trim() || null;
    const { error } = await supabase.from("availability_submissions").update({ manager_note: managerNote }).eq("id", submission.id);
    setBusyId(null);
    if (error) { setMessage("לא הצלחנו לשמור את הערת המנהל."); return; }
    setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, manager_note: managerNote } : item));
    setMessage("הערת המנהל נשמרה.");
  }

  if (!periods.length) return <section className="template-list-card"><div className="empty-template-state"><ClipboardCheck size={42} /><h2>אין עדיין חודשי עבודה</h2><p>פתח חודש עבודה כדי להתחיל לקבל הגשות.</p></div></section>;

  return <section className="template-list-card">
    <div className="template-list-heading"><div><p className="eyebrow">חודש וסניף</p><h2>{period ? `${monthNames[period.month - 1]} ${period.year}` : ""}</h2></div><select className="input" style={{ maxWidth: 300 }} value={selectedPeriodId} onChange={(e) => { setSelectedPeriodId(e.target.value); setExpandedUserId(null); }}>{periods.map((item) => <option value={item.id} key={item.id}>{monthNames[item.month - 1]} {item.year} · {branches.find((branch) => branch.id === item.branch_id)?.name ?? "סניף"}</option>)}</select></div>
    <div className="workspace-stats" style={{ margin: "0 0 20px" }}>
      <article><Users /><span><strong>{periodWorkers.length}</strong><small>עובדים פעילים</small></span></article>
      <article><CheckCircle2 /><span><strong>{submittedCount}</strong><small>הגישו סופית</small></span></article>
      <article><XCircle /><span><strong>{missingCount}</strong><small>עדיין לא התחילו</small></span></article>
    </div>
    <div className="actions" style={{ marginBottom: 18 }}>
      {([["all","הכול"],["submitted","הוגש"],["draft","טיוטה"],["missing","חסר"]] as const).map(([value,label]) => <button className={`button ${filter === value ? "primary" : ""}`} onClick={() => setFilter(value)} key={value}>{label}{value === "draft" ? ` (${draftCount})` : ""}</button>)}
    </div>
    {period ? <div className="submission-banner open"><Clock3 /><div><strong>{period.status === "collecting" ? "ההגשה פתוחה" : period.status === "draft" ? "ההגשה נסגרה" : "הסידור פורסם"}</strong><span>דדליין: {new Date(period.submission_closes_at).toLocaleString("he-IL")}</span></div></div> : null}
    <div className="template-list">
      {visibleWorkers.map((worker) => {
        const { submission, state } = workerState(worker);
        const name = worker.profile ? `${worker.profile.first_name} ${worker.profile.last_name}`.trim() : "עובד/ת";
        const submissionEntries = submission ? entries.filter((entry) => entry.submission_id === submission.id) : [];
        const expanded = expandedUserId === worker.user_id;
        return <article className="card" key={worker.id}>
          <div className="mini-row" style={{ border: 0, padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div className="template-icon" style={{ color: worker.profile?.color }}><UserRound /></div><span><strong>{name}</strong><small>{worker.role === "manager" ? "מנהל/ת" : "עובד/ת"} · {submissionEntries.length} סימונים</small></span></div>
            <span className={`badge ${state === "submitted" ? "success" : state === "draft" ? "warning" : "critical"}`}>{state === "submitted" ? "הוגש" : state === "draft" ? "טיוטה" : "חסר"}</span>
            {submission ? <button className="button" onClick={() => setExpandedUserId(expanded ? null : worker.user_id)}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} פירוט</button> : null}
          </div>
          {expanded && submission ? <div className="grid" style={{ marginTop: 16 }}>
            <div className="table-wrap"><table className="table compact-table"><thead><tr><th>תאריך</th><th>משמרת</th><th>זמינות</th><th>הערה</th></tr></thead><tbody>{submissionEntries.map((entry) => { const template = templates.find((item) => item.id === entry.shift_template_id); return <tr key={entry.id}><td>{new Date(`${entry.shift_date}T12:00:00`).toLocaleDateString("he-IL")}</td><td>{template?.name ?? "משמרת"} {template ? `${template.start_time.slice(0,5)}–${template.end_time.slice(0,5)}` : ""}</td><td>{statusLabels[entry.status]}</td><td>{entry.note || "—"}</td></tr>; })}{!submissionEntries.length ? <tr><td colSpan={4}>העובד עדיין לא סימן משמרות.</td></tr> : null}</tbody></table></div>
            <label className="field"><span>הערת מנהל פנימית</span><textarea className="textarea" value={notes[submission.id] ?? ""} onChange={(e) => setNotes((current) => ({ ...current, [submission.id]: e.target.value }))} /></label>
            <button className="button" disabled={busyId === submission.id} onClick={() => void saveManagerNote(submission)}>{busyId === submission.id ? <Loader2 className="spin" size={16} /> : <Save size={16} />} שמירת הערה</button>
          </div> : null}
        </article>;
      })}
      {!visibleWorkers.length ? <div className="empty-template-state"><ClipboardCheck size={38} /><p>אין עובדים בקטגוריה שנבחרה.</p></div> : null}
    </div>
    {message ? <p className="auth-message" role="status">{message}</p> : null}
  </section>;
}
