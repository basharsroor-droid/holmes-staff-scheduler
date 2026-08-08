"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Loader2, Repeat2, Send, X } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type SwapStatus = Database["public"]["Enums"]["swap_status"];
type Shift = { id: string; shift_date: string; name: string; start_time: string; end_time: string; status: string };
type Assignment = { id: string; shift_id: string; user_id: string };
type Worker = { id: string; user_id: string; branch_id: string | null; role: string; profile: { id: string; first_name: string; last_name: string; color: string } | null };
type Request = { id: string; original_assignment_id: string; requested_by: string; target_user_id: string | null; target_shift_id: string | null; reason: string; status: SwapStatus; manager_note: string | null; created_at: string; decided_at: string | null };

const statusLabels: Record<SwapStatus, string> = {
  pending_employee: "ממתינה לעובד/ת",
  pending_manager: "ממתינה למנהל/ת",
  approved: "אושרה",
  rejected: "נדחתה",
  cancelled: "בוטלה"
};

export function ShiftSwapsClient({ organizationId, currentUserId, isManager, shifts, assignments: initialAssignments, workers, requests: initialRequests }: {
  organizationId: string; currentUserId: string; isManager: boolean; shifts: Shift[]; assignments: Assignment[]; workers: Worker[]; requests: Request[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [requests, setRequests] = useState(initialRequests);
  const [originalAssignmentId, setOriginalAssignmentId] = useState("");
  const [targetAssignmentId, setTargetAssignmentId] = useState("");
  const [reason, setReason] = useState("");
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialRequests.map((item) => [item.id, item.manager_note ?? ""])));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const myAssignments = assignments.filter((item) => item.user_id === currentUserId && shifts.some((shift) => shift.id === item.shift_id));
  const targetAssignments = assignments.filter((item) => item.user_id !== currentUserId && shifts.some((shift) => shift.id === item.shift_id));
  const visibleRequests = isManager ? requests : requests.filter((item) => item.requested_by === currentUserId || item.target_user_id === currentUserId);

  function shiftForAssignment(assignmentId: string) {
    const assignment = assignments.find((item) => item.id === assignmentId);
    return assignment ? shifts.find((item) => item.id === assignment.shift_id) : null;
  }

  function name(userId: string | null) {
    const profile = workers.find((item) => item.user_id === userId)?.profile;
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "עובד/ת";
  }

  function shiftLabel(shift: Shift | null | undefined) {
    if (!shift) return "משמרת";
    return `${new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric" })} · ${shift.name} · ${shift.start_time.slice(0,5)}–${shift.end_time.slice(0,5)}`;
  }

  async function addEvent(requestId: string, action: string, note?: string | null) {
    await supabase.from("swap_request_events").insert({ organization_id: organizationId, swap_request_id: requestId, actor_user_id: currentUserId, action, note: note || null });
  }

  async function createRequest() {
    const original = assignments.find((item) => item.id === originalAssignmentId);
    const target = assignments.find((item) => item.id === targetAssignmentId);
    if (!original || !target || !reason.trim()) { setMessage("יש לבחור שתי משמרות ולכתוב סיבה לבקשה."); return; }
    setBusy("create"); setMessage("");
    const { data, error } = await supabase.from("swap_requests").insert({
      organization_id: organizationId,
      original_assignment_id: original.id,
      requested_by: currentUserId,
      target_user_id: target.user_id,
      target_shift_id: target.shift_id,
      reason: reason.trim(),
      status: "pending_employee"
    }).select("id, original_assignment_id, requested_by, target_user_id, target_shift_id, reason, status, manager_note, created_at, decided_at").single();
    setBusy("");
    if (error || !data) { setMessage("פתיחת בקשת ההחלפה נכשלה."); return; }
    setRequests((current) => [data, ...current]);
    setOriginalAssignmentId(""); setTargetAssignmentId(""); setReason("");
    void addEvent(data.id, "created", data.reason);
    setMessage("הבקשה נשלחה לעובד/ת השני/ה.");
  }

  async function updateStatus(request: Request, status: SwapStatus, note?: string | null) {
    setBusy(request.id); setMessage("");
    const patch = { status, manager_note: note || null, decided_at: ["approved", "rejected", "cancelled"].includes(status) ? new Date().toISOString() : null, decided_by: ["approved", "rejected"].includes(status) ? currentUserId : null };
    const { error } = await supabase.from("swap_requests").update(patch).eq("id", request.id);
    setBusy("");
    if (error) { setMessage("עדכון הבקשה נכשל."); return false; }
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...patch } : item));
    void addEvent(request.id, status, note);
    return true;
  }

  async function approve(request: Request) {
    const original = assignments.find((item) => item.id === request.original_assignment_id);
    const target = assignments.find((item) => item.shift_id === request.target_shift_id && item.user_id === request.target_user_id);
    if (!original || !target || !request.target_user_id) {
      setMessage("השיבוצים השתנו מאז פתיחת הבקשה. לא ניתן לאשר אותה.");
      return;
    }

    setBusy(request.id);
    setMessage("");
    const note = managerNotes[request.id]?.trim() || null;
    const { error } = await supabase.rpc("approve_shift_swap", {
      target_request_id: request.id,
      decision_note: note ?? undefined
    });
    setBusy("");

    if (error) {
      setMessage("אישור ההחלפה נכשל. לא בוצע שינוי חלקי.");
      return;
    }

    const decidedAt = new Date().toISOString();
    setAssignments((current) => current.map((item) =>
      item.id === original.id
        ? { ...item, user_id: request.target_user_id! }
        : item.id === target.id
          ? { ...item, user_id: request.requested_by }
          : item
    ));
    setRequests((current) => current.map((item) =>
      item.id === request.id
        ? { ...item, status: "approved", manager_note: note, decided_at: decidedAt }
        : item
    ));
    setMessage("ההחלפה אושרה והסידור עודכן.");
  }

  return <div className="grid">
    {!isManager ? <section className="template-list-card">
      <div className="template-list-heading"><div><p className="eyebrow">בקשה חדשה</p><h2>החלפת משמרת</h2></div><Repeat2 /></div>
      <label className="field"><span>המשמרת שלי</span><select className="input" value={originalAssignmentId} onChange={(event) => setOriginalAssignmentId(event.target.value)}><option value="">בחירת משמרת</option>{myAssignments.map((assignment) => <option value={assignment.id} key={assignment.id}>{shiftLabel(shiftForAssignment(assignment.id))}</option>)}</select></label>
      <label className="field"><span>המשמרת המבוקשת</span><select className="input" value={targetAssignmentId} onChange={(event) => setTargetAssignmentId(event.target.value)}><option value="">בחירת עובד ומשמרת</option>{targetAssignments.map((assignment) => <option value={assignment.id} key={assignment.id}>{name(assignment.user_id)} · {shiftLabel(shiftForAssignment(assignment.id))}</option>)}</select></label>
      <label className="field"><span>סיבת ההחלפה</span><textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="למשל: מבחן באוניברסיטה" /></label>
      <button className="button primary" disabled={!!busy || !myAssignments.length} onClick={() => void createRequest()}>{busy === "create" ? <Loader2 className="spin" size={16} /> : <Send size={16} />} שליחת בקשה</button>
      {!myAssignments.length ? <p className="auth-message">אין כרגע משמרות עתידיות שניתן להחליף.</p> : null}
    </section> : null}

    <section className="template-list-card">
      <div className="template-list-heading"><div><p className="eyebrow">{isManager ? "אישור מנהל" : "מעקב"}</p><h2>{isManager ? "בקשות החלפה" : "הבקשות שלי"}</h2></div><span className="badge warning"><Clock3 size={15} /> {visibleRequests.filter((item) => item.status.startsWith("pending")).length} ממתינות</span></div>
      <div className="template-list">{visibleRequests.map((request) => {
        const original = shiftForAssignment(request.original_assignment_id);
        const target = shifts.find((item) => item.id === request.target_shift_id);
        const canEmployeeDecide = request.target_user_id === currentUserId && request.status === "pending_employee";
        return <article className="card" key={request.id}><div className="mini-row" style={{ border: 0, padding: 0 }}><div className="template-icon"><Repeat2 /></div><span><strong>{name(request.requested_by)} ↔ {name(request.target_user_id)}</strong><small>{shiftLabel(original)}<br />מול {shiftLabel(target)}</small></span><span className={`badge ${request.status === "approved" ? "success" : request.status === "rejected" || request.status === "cancelled" ? "critical" : "warning"}`}>{statusLabels[request.status]}</span></div><p className="card-muted" style={{ marginTop: 12 }}>{request.reason}</p>
          {request.manager_note ? <p><strong>הערת מנהל:</strong> {request.manager_note}</p> : null}
          {canEmployeeDecide ? <div className="actions"><button className="button primary" disabled={!!busy} onClick={() => void updateStatus(request, "pending_manager")}><Check size={16} /> אישור והעברה למנהל</button><button className="button" disabled={!!busy} onClick={() => void updateStatus(request, "rejected")}><X size={16} /> דחייה</button></div> : null}
          {request.requested_by === currentUserId && request.status.startsWith("pending") ? <button className="button" disabled={!!busy} onClick={() => void updateStatus(request, "cancelled")}><X size={16} /> ביטול בקשה</button> : null}
          {isManager && request.status === "pending_manager" ? <div className="grid"><label className="field"><span>הערת מנהל אופציונלית</span><textarea className="textarea" value={managerNotes[request.id] ?? ""} onChange={(event) => setManagerNotes((current) => ({ ...current, [request.id]: event.target.value }))} /></label><div className="actions"><button className="button primary" disabled={!!busy} onClick={() => void approve(request)}>{busy === request.id ? <Loader2 className="spin" size={16} /> : <Check size={16} />} אישור והחלפה</button><button className="button" disabled={!!busy} onClick={() => void updateStatus(request, "rejected", managerNotes[request.id]?.trim() || null)}><X size={16} /> דחייה</button></div></div> : null}
        </article>;
      })}</div>
      {!visibleRequests.length ? <div className="empty-template-state"><Repeat2 size={38} /><p>אין כרגע בקשות החלפה.</p></div> : null}
      {message ? <p className="auth-message" role="status">{message}</p> : null}
    </section>
  </div>;
}
