"use client";

import { useMemo, useState } from "react";
import { Loader2, Power, ShieldCheck, UserRound, Users } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type Role = Database["public"]["Enums"]["member_role"];
type Status = Database["public"]["Enums"]["member_status"];

type Employee = {
  id: string;
  user_id: string;
  role: Role;
  status: Status;
  seniority_level: string;
  can_open: boolean;
  can_close: boolean;
  employee_number: string | null;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    color: string;
  } | null;
};

const roleLabels: Record<Role, string> = {
  owner: "בעלים",
  admin: "מנהל מערכת",
  manager: "מנהל/ת",
  employee: "עובד/ת"
};

export function EmployeesClient({
  currentUserId,
  employees: initialEmployees,
  organizationId
}: {
  currentUserId: string;
  employees: Employee[];
  organizationId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [employees, setEmployees] = useState(initialEmployees);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function updateEmployee(id: string, changes: Partial<Pick<Employee, "role" | "status" | "can_open" | "can_close">>) {
    setMessage("");
    setBusyId(id);
    const { error } = await supabase
      .from("organization_memberships")
      .update(changes)
      .eq("id", id)
      .eq("organization_id", organizationId);
    setBusyId(null);

    if (error) {
      setMessage("לא הצלחנו לעדכן את העובד. בדוק את ההרשאות ונסה שוב.");
      return;
    }
    setEmployees((current) => current.map((employee) => employee.id === id ? { ...employee, ...changes } : employee));
    setMessage("פרטי העובד עודכנו בהצלחה.");
  }

  return (
    <section className="template-list-card">
      <div className="template-list-heading">
        <div><p className="eyebrow">הצוות של העסק</p><h2>{employees.length} חברי צוות</h2></div>
        <span className="status-chip active"><ShieldCheck size={14} /> הרשאות מאובטחות</span>
      </div>
      {message ? <p className="auth-message" role="status">{message}</p> : null}
      <div className="template-list">
        {employees.map((employee) => {
          const isSelf = employee.user_id === currentUserId;
          const name = employee.profile
            ? `${employee.profile.first_name} ${employee.profile.last_name}`.trim()
            : "משתמש מוזמן";
          return (
            <article className={`template-item ${employee.status === "suspended" ? "inactive" : ""}`} key={employee.id}>
              <div className="template-icon" style={{ color: employee.profile?.color }}><UserRound /></div>
              <div className="template-main">
                <strong>{name}{isSelf ? " (אתה)" : ""}</strong>
                <span>{employee.employee_number ? `מספר עובד ${employee.employee_number}` : roleLabels[employee.role]}</span>
              </div>
              <div className="template-meta">
                <label className="field">
                  <span>תפקיד</span>
                  <select
                    className="input"
                    disabled={isSelf || busyId === employee.id || employee.role === "owner"}
                    value={employee.role}
                    onChange={(event) => void updateEmployee(employee.id, { role: event.target.value as Role })}
                  >
                    <option value="employee">עובד/ת</option>
                    <option value="manager">מנהל/ת</option>
                    <option value="admin">מנהל מערכת</option>
                    {employee.role === "owner" ? <option value="owner">בעלים</option> : null}
                  </select>
                </label>
                <label className="check-field"><input type="checkbox" checked={employee.can_open} disabled={busyId === employee.id} onChange={(event) => void updateEmployee(employee.id, { can_open: event.target.checked })} /><span><strong>פתיחה</strong></span></label>
                <label className="check-field"><input type="checkbox" checked={employee.can_close} disabled={busyId === employee.id} onChange={(event) => void updateEmployee(employee.id, { can_close: event.target.checked })} /><span><strong>סגירה</strong></span></label>
              </div>
              <button
                className="button"
                disabled={isSelf || busyId === employee.id || employee.role === "owner"}
                onClick={() => void updateEmployee(employee.id, { status: employee.status === "suspended" ? "active" : "suspended" })}
              >
                {busyId === employee.id ? <Loader2 className="spin" size={16} /> : <Power size={16} />}
                {employee.status === "suspended" ? "הפעלה" : "השבתה"}
              </button>
            </article>
          );
        })}
        {!employees.length ? <div className="empty-template-state"><Users size={36} /><p>עדיין אין עובדים בסביבת העבודה.</p></div> : null}
      </div>
    </section>
  );
}
