"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, Palmtree, XCircle } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LeaveType = "vacation" | "sick";
type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

type LeaveRequest = {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  note: string | null;
  status: LeaveStatus;
  manager_note: string | null;
};

const leaveTypeLabels: Record<LeaveType, string> = {
  vacation: "חופשה",
  sick: "מחלה"
};

const statusLabels: Record<LeaveStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  cancelled: "בוטל"
};

function statusIcon(status: LeaveStatus) {
  if (status === "approved") return <CheckCircle2 size={16} />;
  if (status === "rejected" || status === "cancelled") return <XCircle size={16} />;
  return <Clock3 size={16} />;
}

export function TimeOffClient({ organizationId, userId, initialRequests }: {
  organizationId: string;
  userId: string;
  initialRequests: LeaveRequest[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const db = supabase as any;
  const [requests, setRequests] = useState(initialRequests);
  const [form, setForm] = useState<{ leaveType: LeaveType; startDate: string; endDate: string; note: string }>({
    leaveType: "vacation",
    startDate: "",
    endDate: "",
    note: ""
  });
  const [busy, setBusy] = useState("");
  const { message, kind, setMessage } = useStatusMessage();

  async function submitRequest() {
    setMessage("");
    if (!form.startDate || !form.endDate) {
      setMessage("יש לבחור תאריך התחלה וסיום.", "error");
      return;
    }
    if (form.endDate < form.startDate) {
      setMessage("תאריך הסיום חייב להיות אחרי תאריך ההתחלה.", "error");
      return;
    }

    setBusy("create");
    const { data, error } = await db
      .from("leave_requests")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        leave_type: form.leaveType,
        start_date: form.startDate,
        end_date: form.endDate,
        note: form.note.trim() || null,
        status: "pending"
      })
      .select("id, leave_type, start_date, end_date, note, status, manager_note")
      .single();
    setBusy("");

    if (error || !data) {
      setMessage("לא הצלחנו לשלוח את בקשת החופשה.", "error");
      return;
    }

    setRequests((current) => [data as LeaveRequest, ...current]);
    setForm({ leaveType: "vacation", startDate: "", endDate: "", note: "" });
    setMessage("הבקשה נשלחה למנהל לאישור.");
  }

  async function cancelRequest(id: string) {
    setBusy(id);
    setMessage("");
    const { data, error } = await db.rpc("cancel_leave_request", { target_request_id: id });
    setBusy("");

    if (error || !data) {
      setMessage("לא הצלחנו לבטל את הבקשה.", "error");
      return;
    }

    setRequests((current) => current.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
    setMessage("הבקשה בוטלה.");
  }

  return <section className="template-form-card availability-leave-card-v2">
    <div>
      <p className="eyebrow">Time Off</p>
      <h2>חופשה ומחלה</h2>
    </div>
    <p className="auth-secondary">שולחים בקשה למנהל. רק לאחר אישור היא תחסום שיבוץ אוטומטית בבניית הסידור.</p>

    <div className="form-pair">
      <label className="field">
        <span>סוג היעדרות</span>
        <select className="input" value={form.leaveType} onChange={(event) => setForm((current) => ({ ...current, leaveType: event.target.value as LeaveType }))}>
          {Object.entries(leaveTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>הערה אופציונלית</span>
        <input className="input" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="לדוגמה: חופשה משפחתית" />
      </label>
    </div>

    <div className="form-pair">
      <label className="field"><span>מתאריך</span><input className="input" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
      <label className="field"><span>עד תאריך</span><input className="input" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
    </div>

    <button className="button primary" disabled={busy === "create"} onClick={() => void submitRequest()}>
      {busy === "create" ? <Loader2 className="spin" size={17} /> : <Palmtree size={17} />} שליחת בקשה לאישור
    </button>
    <StatusMessage message={message} kind={kind} />

    {requests.length ? <div className="template-list">
      {requests.map((request) => <article className="template-item" key={request.id}>
        <div className="template-main">
          <strong>{leaveTypeLabels[request.leave_type]}</strong>
          <span>{new Date(`${request.start_date}T12:00:00`).toLocaleDateString("he-IL")} – {new Date(`${request.end_date}T12:00:00`).toLocaleDateString("he-IL")}{request.note ? ` · ${request.note}` : ""}</span>
          <span className={`badge ${request.status === "approved" ? "opening" : request.status === "pending" ? "warning" : "critical"}`}>{statusIcon(request.status)} {statusLabels[request.status]}</span>
          {request.manager_note ? <small>הערת מנהל: {request.manager_note}</small> : null}
        </div>
        {(request.status === "pending" || request.status === "approved") ? <button className="button danger" disabled={busy === request.id} onClick={() => void cancelRequest(request.id)}>
          {busy === request.id ? <Loader2 className="spin" size={15} /> : <XCircle size={15} />} ביטול
        </button> : null}
      </article>)}
    </div> : null}
  </section>;
}
