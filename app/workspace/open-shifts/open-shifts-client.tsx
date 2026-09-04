"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type OpenShift = {
  id: string;
  shift_date: string;
  name: string;
  start_time: string;
  end_time: string;
  branch_name: string;
  department_name: string;
  requested: boolean;
  request_id: string | null;
  request_status: string | null;
};

export function OpenShiftsClient({ initialShifts }: { initialShifts: OpenShift[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shifts, setShifts] = useState(initialShifts);
  const [busy, setBusy] = useState("");
  const { message, kind, setMessage } = useStatusMessage();

  async function requestShift(shiftId: string) {
    setBusy(`request-${shiftId}`);
    setMessage("");
    const { data, error } = await (supabase as any).rpc("request_open_shift", {
      target_shift_id: shiftId,
      request_note: null
    });
    setBusy("");
    if (error || !data) {
      setMessage("שליחת הבקשה נכשלה. ייתכן שהמשמרת כבר אוישה או נסגרה לבקשות.", "error");
      return;
    }
    setShifts((current) => current.map((item) => item.id === shiftId ? {
      ...item,
      requested: true,
      request_id: data.id,
      request_status: data.status
    } : item));
    setMessage("הבקשה נשלחה למנהל לאישור.");
  }

  async function cancelRequest(shiftId: string, requestId: string) {
    setBusy(`cancel-${shiftId}`);
    setMessage("");
    const { error } = await (supabase as any).rpc("cancel_open_shift_request", {
      target_request_id: requestId
    });
    setBusy("");
    if (error) {
      setMessage("ביטול הבקשה נכשל.", "error");
      return;
    }
    setShifts((current) => current.map((item) => item.id === shiftId ? {
      ...item,
      requested: false,
      request_id: null,
      request_status: "cancelled"
    } : item));
    setMessage("הבקשה בוטלה.");
  }

  if (!shifts.length) {
    return <section className="template-list-card"><div className="empty-template-state"><CheckCircle2 size={42} /><h2>אין כרגע משמרות פתוחות</h2><p>כשמנהל יפתח משמרת לאיוש, היא תופיע כאן.</p></div></section>;
  }

  return <section className="template-list-card">
    <div className="template-list-heading"><div><p className="eyebrow">משמרות פתוחות</p><h2>בקשות להצטרפות למשמרת</h2><p>שליחת בקשה אינה משבצת אותך אוטומטית. המנהל מאשר לפני שהסידור משתנה.</p></div></div>
    <div className="grid">
      {shifts.map((shift) => <article className="card-muted" key={shift.id}>
        <div className="shift-title"><span>{shift.name}</span><small>{new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}</small></div>
        <p>{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)} · {shift.branch_name} · {shift.department_name}</p>
        <div className="actions">
          {shift.requested && shift.request_id
            ? <button className="button danger" disabled={!!busy} onClick={() => void cancelRequest(shift.id, shift.request_id!)}>{busy === `cancel-${shift.id}` ? <Loader2 className="spin" size={16} /> : <XCircle size={16} />} ביטול בקשה</button>
            : <button className="button primary" disabled={!!busy} onClick={() => void requestShift(shift.id)}>{busy === `request-${shift.id}` ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} שליחת בקשה</button>}
          {shift.request_status === "pending" ? <span className="status-chip warning">ממתין לאישור</span> : null}
        </div>
      </article>)}
    </div>
    <StatusMessage message={message} kind={kind} />
  </section>;
}
