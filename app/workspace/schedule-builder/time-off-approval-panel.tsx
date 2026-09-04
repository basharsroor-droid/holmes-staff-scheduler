"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, Palmtree, XCircle } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LeaveType = "vacation" | "sick";

type PendingRequest = {
  id: string;
  user_id: string;
  employee_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  note: string | null;
};

const leaveTypeLabels: Record<LeaveType, string> = {
  vacation: "חופשה",
  sick: "מחלה"
};

export function TimeOffApprovalPanel({ initialRequests }: { initialRequests: PendingRequest[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const db = supabase as any;
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const { message, kind, setMessage } = useStatusMessage();

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    setMessage("");
    const { error } = await db.rpc("decide_leave_request", {
      target_request_id: id,
      decision,
      decision_note: notes[id]?.trim() || null
    });
    setBusy("");

    if (error) {
      setMessage("לא הצלחנו לעדכן את בקשת החופשה.", "error");
      return;
    }

    setRequests((current) => current.filter((request) => request.id !== id));
    setMessage(decision === "approved" ? "בקשת החופשה אושרה והשיבוץ ייחסם בטווח התאריכים." : "בקשת החופשה נדחתה.");

    // Refresh the server-rendered approved Time Off list immediately so the
    // ScheduleBuilderClient receives the new hard constraint without requiring
    // the manager to manually reload the page.
    router.refresh();
  }

  return <section className="template-list-card" style={{ marginBottom: 20 }}>
    <div className="template-list-heading">
      <div>
        <p className="eyebrow">Time Off</p>
        <h2><Palmtree size={20} /> בקשות חופשה שממתינות לאישור</h2>
      </div>
      <span className={`badge ${requests.length ? "warning" : "opening"}`}><Clock3 size={15} /> {requests.length} ממתינות</span>
    </div>

    <StatusMessage message={message} kind={kind} />

    {requests.length ? <div className="template-list">
      {requests.map((request) => <article className="template-item" key={request.id}>
        <div className="template-main">
          <strong>{request.employee_name} · {leaveTypeLabels[request.leave_type]}</strong>
          <span>{new Date(`${request.start_date}T12:00:00`).toLocaleDateString("he-IL")} – {new Date(`${request.end_date}T12:00:00`).toLocaleDateString("he-IL")}</span>
          {request.note ? <small>הערת עובד: {request.note}</small> : null}
          <input
            className="input"
            placeholder="הערת מנהל אופציונלית"
            value={notes[request.id] ?? ""}
            onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="button primary" disabled={busy === request.id} onClick={() => void decide(request.id, "approved")}>
            {busy === request.id ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />} אישור
          </button>
          <button className="button danger" disabled={busy === request.id} onClick={() => void decide(request.id, "rejected")}>
            <XCircle size={15} /> דחייה
          </button>
        </div>
      </article>)}
    </div> : <div className="empty-template-state">
      <CheckCircle2 size={38} />
      <h3>אין בקשות שממתינות לטיפול</h3>
      <p>בקשות חדשות יופיעו כאן לפני שהן משפיעות על הסידור.</p>
    </div>}
  </section>;
}
