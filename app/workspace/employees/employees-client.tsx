"use client";

import { useMemo, useState } from "react";
import { Crown, Loader2, MailPlus, Power, RotateCw, ShieldCheck, UserRound, UserX, Users } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type Role = Database["public"]["Enums"]["member_role"];
type Status = Database["public"]["Enums"]["member_status"];
type Employee = {
  id: string; user_id: string; role: Role; status: Status; seniority_level: string;
  can_open: boolean; can_close: boolean; employee_number: string | null;
  profile: { id: string; first_name: string; last_name: string; phone: string | null; color: string } | null;
};
type Invitation = {
  id: string; email: string; first_name: string; last_name: string; role: Role;
  status: string; token: string; branch_id: string; expires_at: string; created_at: string;
};
type Branch = { id: string; name: string };

const roleLabels: Record<Role, string> = { owner: "בעלים", admin: "מנהל מערכת", manager: "מנהל/ת", employee: "עובד/ת" };

export function EmployeesClient({
  currentUserId, employees: initialEmployees, invitations: initialInvitations,
  organizationId, branches, selectedBranchId, callerRole
}: {
  currentUserId: string; employees: Employee[]; invitations: Invitation[]; organizationId: string;
  branches: Branch[]; selectedBranchId: string; callerRole: Role;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [employees, setEmployees] = useState(initialEmployees);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "employee" as Role, branchId: selectedBranchId });

  async function updateEmployee(id: string, changes: Partial<Pick<Employee, "role" | "status" | "can_open" | "can_close">>) {
    setMessage(""); setBusyId(id);
    const { error } = await supabase.from("organization_memberships").update(changes).eq("id", id).eq("organization_id", organizationId);
    setBusyId(null);
    if (error) { setMessage("לא הצלחנו לעדכן את העובד. בדוק את ההרשאות ונסה שוב."); return; }
    setEmployees((current) => current.map((employee) => employee.id === id ? { ...employee, ...changes } : employee));
    // Suspending triggers a server-side cleanup (organization_memberships_release_future_shifts)
    // that removes the employee from every not-yet-past shift, so the schedule never keeps
    // showing someone who can no longer work it.
    setMessage(changes.status === "suspended" ? "העובד הושבת, וכל השיבוצים העתידיים שלו הוסרו אוטומטית מהסידור." : "פרטי העובד עודכנו בהצלחה.");
  }

  async function sendMagicLink(token: string) {
    const response = await fetch("/api/invitations/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (response.ok) return { error: null };
    const body: { error?: string } = await response.json().catch(() => ({}));
    return { error: { message: body.error ?? "Failed to send invitation" } };
  }

  async function inviteEmployee() {
    setMessage("");
    if (!form.firstName.trim() || !form.email.includes("@") || !form.branchId) {
      setMessage("יש להזין שם פרטי, מייל תקין וסניף."); return;
    }
    setInviteBusy(true);
    const normalizedEmail = form.email.trim().toLowerCase();
    const { data: token, error: invitationError } = await supabase.rpc("create_organization_invitation", {
      target_organization_id: organizationId,
      target_branch_id: form.branchId,
      target_email: normalizedEmail,
      target_first_name: form.firstName.trim(),
      target_last_name: form.lastName.trim(),
      target_role: form.role
    });
    if (invitationError || !token) {
      setInviteBusy(false);
      setMessage(invitationError?.message.includes("already a member") ? "כתובת המייל כבר שייכת לחבר צוות בעסק." : "לא הצלחנו ליצור את ההזמנה.");
      return;
    }
    const { error: emailError } = await sendMagicLink(token);
    setInviteBusy(false);
    if (emailError) {
      setMessage(emailError.message.toLowerCase().includes("rate limit") ? "ההזמנה נשמרה, אך קיימת כרגע מגבלת שליחת מיילים. אפשר לשלוח שוב מאוחר יותר." : "ההזמנה נשמרה, אך שליחת המייל נכשלה.");
      return;
    }
    const newInvitation: Invitation = {
      id: token, email: normalizedEmail, first_name: form.firstName.trim(), last_name: form.lastName.trim(),
      role: form.role, status: "pending", token, branch_id: form.branchId,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), created_at: new Date().toISOString()
    };
    setInvitations((current) => [newInvitation, ...current.filter((item) => !(item.email === normalizedEmail && item.status === "pending"))]);
    setForm((current) => ({ ...current, firstName: "", lastName: "", email: "", role: "employee" }));
    setMessage("ההזמנה נשלחה בהצלחה.");
  }

  async function resendInvitation(invitation: Invitation) {
    setBusyId(invitation.id);
    const { error } = await sendMagicLink(invitation.token);
    setBusyId(null);
    // The server enforces a cooldown between resends and returns a specific
    // Hebrew message for it (e.g. "יש להמתין עוד X שניות") -- show that
    // instead of a generic failure message when we have it.
    setMessage(error ? (error.message || "לא הצלחנו לשלוח את ההזמנה מחדש.") : "ההזמנה נשלחה מחדש.");
  }

  async function revokeInvitation(invitation: Invitation) {
    setBusyId(invitation.id);
    const { error } = await supabase.from("organization_invitations").update({ status: "revoked" }).eq("id", invitation.id).eq("organization_id", organizationId);
    setBusyId(null);
    if (error) { setMessage("לא הצלחנו לבטל את ההזמנה."); return; }
    setInvitations((current) => current.map((item) => item.id === invitation.id ? { ...item, status: "revoked" } : item));
    setMessage("ההזמנה בוטלה.");
  }

  async function transferOwnership(employee: Employee) {
    const name = employee.profile ? `${employee.profile.first_name} ${employee.profile.last_name}`.trim() : "המשתמש הנבחר";
    if (!window.confirm(`להעביר את הבעלות על העסק ל${name}? התפקיד שלך יירד ל"מנהל מערכת" מיד לאחר מכן. הפעולה בלתי הפיכה מהצד שלך לבד — רק הבעלים החדש יוכל להעביר בחזרה.`)) return;
    setMessage(""); setBusyId(employee.id);
    const { error } = await supabase.rpc("transfer_organization_ownership", { target_user_id: employee.user_id });
    setBusyId(null);
    if (error) { setMessage("העברת הבעלות נכשלה. ייתכן שהמשתמש כבר אינו חבר פעיל בעסק."); return; }
    setEmployees((current) => current.map((item) => {
      if (item.id === employee.id) return { ...item, role: "owner" };
      if (item.user_id === currentUserId) return { ...item, role: "admin" };
      return item;
    }));
    setMessage(`הבעלות הועברה ל${name}. התפקיד שלך עודכן ל"מנהל מערכת".`);
  }

  return (
    <div className="template-workbench">
      <section className="template-form-card">
        <div><p className="eyebrow">עובד חדש</p><h2>שליחת הזמנה במייל</h2></div>
        <div className="form-pair">
          <label className="field"><span>שם פרטי</span><input className="input" value={form.firstName} onChange={(e) => setForm((c) => ({ ...c, firstName: e.target.value }))} /></label>
          <label className="field"><span>שם משפחה</span><input className="input" value={form.lastName} onChange={(e) => setForm((c) => ({ ...c, lastName: e.target.value }))} /></label>
        </div>
        <label className="field"><span>כתובת מייל</span><input className="input" type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} /></label>
        <div className="form-pair">
          <label className="field"><span>סניף</span><select className="input" value={form.branchId} onChange={(e) => setForm((c) => ({ ...c, branchId: e.target.value }))}>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>
          <label className="field"><span>תפקיד</span><select className="input" value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value as Role }))}><option value="employee">עובד/ת</option>{callerRole !== "manager" ? <><option value="manager">מנהל/ת</option><option value="admin">מנהל מערכת</option></> : null}</select></label>
        </div>
        <button className="button primary" disabled={inviteBusy} onClick={() => void inviteEmployee()}>{inviteBusy ? <Loader2 className="spin" size={17} /> : <MailPlus size={17} />} שליחת הזמנה</button>
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <div><p className="eyebrow">הזמנות אחרונות</p><div className="template-list">
          {invitations.slice(0, 6).map((invitation) => <article className={`template-item ${invitation.status !== "pending" ? "inactive" : ""}`} key={invitation.id}>
            <div className="template-main"><strong>{invitation.first_name} {invitation.last_name}</strong><span>{invitation.email}</span></div>
            <span className="status-chip">{invitation.status === "pending" ? "ממתין" : invitation.status === "accepted" ? "התקבל" : "בוטל"}</span>
            {invitation.status === "pending" ? <div className="actions"><button className="button" disabled={busyId === invitation.id} onClick={() => void resendInvitation(invitation)}><RotateCw size={15} /> שליחה חוזרת</button><button className="button danger" disabled={busyId === invitation.id} onClick={() => void revokeInvitation(invitation)}><UserX size={15} /> ביטול</button></div> : null}
          </article>)}
        </div></div>
      </section>

      <section className="template-list-card">
        <div className="template-list-heading"><div><p className="eyebrow">הצוות של העסק</p><h2>{employees.length} חברי צוות</h2></div><span className="status-chip active"><ShieldCheck size={14} /> הרשאות מאובטחות</span></div>
        <div className="template-list">
          {employees.map((employee) => {
            const isSelf = employee.user_id === currentUserId;
            const name = employee.profile ? `${employee.profile.first_name} ${employee.profile.last_name}`.trim() : "משתמש";
            return <article className={`template-item ${employee.status === "suspended" ? "inactive" : ""}`} key={employee.id}>
              <div className="template-icon" style={{ color: employee.profile?.color }}><UserRound /></div>
              <div className="template-main"><strong>{name}{isSelf ? " (אתה)" : ""}</strong><span>{employee.employee_number ? `מספר עובד ${employee.employee_number}` : roleLabels[employee.role]}</span></div>
              <div className="template-meta">
                <label className="field"><span>תפקיד</span><select className="input" disabled={isSelf || busyId === employee.id || employee.role === "owner"} value={employee.role} onChange={(e) => void updateEmployee(employee.id, { role: e.target.value as Role })}><option value="employee">עובד/ת</option><option value="manager">מנהל/ת</option><option value="admin">מנהל מערכת</option>{employee.role === "owner" ? <option value="owner">בעלים</option> : null}</select></label>
                <label className="check-field"><input type="checkbox" checked={employee.can_open} disabled={busyId === employee.id} onChange={(e) => void updateEmployee(employee.id, { can_open: e.target.checked })} /><span><strong>פתיחה</strong></span></label>
                <label className="check-field"><input type="checkbox" checked={employee.can_close} disabled={busyId === employee.id} onChange={(e) => void updateEmployee(employee.id, { can_close: e.target.checked })} /><span><strong>סגירה</strong></span></label>
              </div>
              <button className="button" disabled={isSelf || busyId === employee.id || employee.role === "owner"} onClick={() => void updateEmployee(employee.id, { status: employee.status === "suspended" ? "active" : "suspended" })}>{busyId === employee.id ? <Loader2 className="spin" size={16} /> : <Power size={16} />}{employee.status === "suspended" ? "הפעלה" : "השבתה"}</button>
              {callerRole === "owner" && !isSelf && employee.role !== "owner" && employee.status === "active"
                ? <button className="button" disabled={busyId === employee.id} onClick={() => void transferOwnership(employee)}>{busyId === employee.id ? <Loader2 className="spin" size={16} /> : <Crown size={16} />} העברת בעלות</button>
                : null}
            </article>;
          })}
          {!employees.length ? <div className="empty-template-state"><Users size={36} /><p>עדיין אין עובדים בסביבת העבודה.</p></div> : null}
        </div>
      </section>
    </div>
  );
}
