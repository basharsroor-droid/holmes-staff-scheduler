"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Users, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ShiftRow = { id: string; shift_date: string; name: string; start_time: string; end_time: string; required_employees: number; assigned_count: number; open_for_requests: boolean; period_label: string };
type RequestRow = { id: string; shift_id: string; employee_name: string; created_at: string };

export function OpenShiftsManagerPanel({ initialShifts, initialRequests }: { initialShifts: ShiftRow[]; initialRequests: RequestRow[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [shifts, setShifts] = useState(initialShifts);
  const [requests, setRequests] = useState(initialRequests);
  const [busy, setBusy] = useState("");
  const { message, kind, setMessage } = useStatusMessage();

  async function setOpen(shiftId: string, makeOpen: boolean) {
    setBusy(`open-${shiftId}`); setMessage("");
    const { error } = await (supabase as any).rpc("set_shift_open_for_requests", { target_shift_id: shiftId, make_open: makeOpen });
    setBusy("");
    if (error) { setMessage(makeOpen ? "פתיחת המשמרת לבקשות נכשלה." : "סגירת המשמרת לבקשות נכשלה.", "error"); return; }
    setShifts((current) => current.map((item) => item.id === shiftId ? { ...item, open_for_requests: makeOpen } : item));
    if (!makeOpen) setRequests((current) => current.filter((item) => item.shift_id !== shiftId));
    setMessage(makeOpen ? "המשמרת פתוחה כעת לבקשות עובדים." : "המשמרת נסגרה לבקשות.");
    router.refresh();
  }

  async function decide(requestId: string, decision: "approved" | "rejected") {
    setBusy(`decision-${requestId}`); setMessage("");
    const { error } = await (supabase as any).rpc("decide_open_shift_request", { target_request_id: requestId, decision, decision_note: null });
    setBusy("");
    if (error) { setMessage("עדכון הבקשה נכשל. ייתכן שהמשמרת כבר אוישה או נסגרה.", "error"); return; }
    setRequests((current) => current.filter((item) => item.id !== requestId));
    setMessage(decision === "approved" ? "הבקשה אושרה והעובד שובץ למשמרת." : "הבקשה נדחתה.");
    router.refresh();
  }

  const relevantShifts = shifts.filter((shift) => shift.assigned_count < shift.required_employees);
  if (!relevantShifts.length && !requests.length) return null;

  return <section className="template-list-card">
    <div className="template-list-heading"><div><p className="eyebrow">Open Shifts</p><h2>איוש משמרות פתוחות</h2><p>פתח משמרת לאיוש, קבל בקשות מהצוות ואשר מועמד אחד. רק אישור יוצר שיבוץ בפועל.</p></div></div>
    <div className="grid">
      {relevantShifts.map((shift) => {
        const shiftRequests = requests.filter((request) => request.shift_id === shift.id);
        return <article className="card-muted" key={shift.id}>
          <div className="shift-title"><span>{shift.name}</span><small>{shift.period_label} · {shift.assigned_count}/{shift.required_employees}</small></div>
          <p>{new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })} · {shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}</p>
          <div className="actions">
            <button className={shift.open_for_requests ? "button danger" : "button primary"} disabled={!!busy} onClick={() => void setOpen(shift.id, !shift.open_for_requests)}>{busy === `open-${shift.id}` ? <Loader2 className="spin" size={16} /> : shift.open_for_requests ? <XCircle size={16} /> : <Users size={16} />}{shift.open_for_requests ? " סגירת בקשות" : " פתיחה לעובדים"}</button>
            {shift.open_for_requests ? <span className="status-chip active">פתוחה לבקשות</span> : null}
          </div>
          {shiftRequests.length ? <div className="grid">
            {shiftRequests.map((request) => <div className="card-muted" key={request.id}><strong>{request.employee_name}</strong><small>בקשה מ־{new Date(request.created_at).toLocaleString("he-IL")}</small><div className="actions"><button className="button primary" disabled={!!busy} onClick={() => void decide(request.id, "approved")}><CheckCircle2 size={15} /> אישור ושיבוץ</button><button className="button" disabled={!!busy} onClick={() => void decide(request.id, "rejected")}><XCircle size={15} /> דחייה</button></div></div>)}
          </div> : shift.open_for_requests ? <p>עדיין לא התקבלו בקשות.</p> : null}
        </article>;
      })}
    </div>
    <StatusMessage message={message} kind={kind} />
  </section>;
}
