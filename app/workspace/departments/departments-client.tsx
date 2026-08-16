"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Loader2, Network, Plus, Power, ShieldCheck, UserRound } from "lucide-react";
import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type Role = Database["public"]["Enums"]["member_role"];
type Branch = { id: string; name: string };
type Department = { id: string; branch_id: string; name: string; active: boolean };
type Assignment = { department_id: string; membership_id: string; is_primary: boolean };
type Member = { id: string; user_id: string; branch_id: string | null; role: Role; status: string; access_scope: string; profile: { id: string; first_name: string; last_name: string } | null };
const roleLabels: Record<Role, string> = { owner: "בעלים", admin: "מנהל מערכת", manager: "מנהל/ת", employee: "עובד/ת" };

export function DepartmentsClient({ organizationId, callerRole, callerBranchId, branches, initialDepartments, assignments: initialAssignments, members }: {
  organizationId: string; callerRole: Role; callerBranchId: string | null; branches: Branch[];
  initialDepartments: Department[]; assignments: Assignment[]; members: Member[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const permittedBranches = callerRole === "manager" && callerBranchId ? branches.filter((branch) => branch.id === callerBranchId) : branches;
  const [branchId, setBranchId] = useState(permittedBranches[0]?.id ?? "");
  const [departments, setDepartments] = useState(initialDepartments);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { message, kind, setMessage } = useStatusMessage();
  const branchDepartments = departments.filter((department) => department.branch_id === branchId);
  const branchMembers = members.filter((member) => member.branch_id === branchId && !["owner", "admin"].includes(member.role));
  const canCreate = ["owner", "admin"].includes(callerRole);

  async function createDepartment() {
    setMessage("");
    if (!branchId || name.trim().length < 2) { setMessage("יש לבחור סניף ולהזין שם מחלקה באורך שני תווים לפחות.", "error"); return; }
    setCreating(true);
    const { data, error } = await supabase.from("departments").insert({ organization_id: organizationId, branch_id: branchId, name: name.trim() }).select("id, branch_id, name, active").single();
    setCreating(false);
    if (error || !data) { setMessage(error?.message.toLowerCase().includes("duplicate") ? "כבר קיימת מחלקה בשם הזה בסניף." : "לא הצלחנו ליצור את המחלקה.", "error"); return; }
    setDepartments((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, "he")));
    setName(""); setMessage("המחלקה נוצרה בהצלחה.");
  }

  async function toggleDepartment(department: Department) {
    setBusyId(department.id); setMessage("");
    const { error } = await supabase.from("departments").update({ active: !department.active, updated_at: new Date().toISOString() }).eq("id", department.id).eq("organization_id", organizationId);
    setBusyId(null);
    if (error) { setMessage("לא הצלחנו לעדכן את המחלקה.", "error"); return; }
    setDepartments((current) => current.map((item) => item.id === department.id ? { ...item, active: !item.active } : item));
    setMessage(department.active ? "המחלקה הושבתה. ההיסטוריה נשמרה." : "המחלקה הופעלה מחדש.");
  }

  async function setMemberDepartment(member: Member, departmentId: string, checked: boolean) {
    const currentIds = assignments.filter((item) => item.membership_id === member.id).map((item) => item.department_id);
    const nextIds = checked ? [...new Set([...currentIds, departmentId])] : currentIds.filter((id) => id !== departmentId);
    if (member.role === "employee" && nextIds.length === 0) { setMessage("עובד חייב להישאר משויך למחלקה אחת לפחות.", "error"); return; }
    setBusyId(member.id); setMessage("");
    const { error } = await supabase.rpc("set_membership_departments", { target_membership_id: member.id, target_department_ids: nextIds });
    setBusyId(null);
    if (error) { setMessage("לא הצלחנו לעדכן את שיוך המחלקות.", "error"); return; }
    setAssignments((current) => [...current.filter((item) => item.membership_id !== member.id), ...nextIds.map((id, index) => ({ department_id: id, membership_id: member.id, is_primary: index === 0 }))]);
    setMessage("שיוך המחלקות נשמר.");
  }

  return <div className="departments-workbench business-setup-workbench">
    <section className="template-form-card departments-sidebar setup-sidebar">
      <div><p className="eyebrow">מבנה העסק</p><h2>בחירת סניף</h2></div>
      <label className="field"><span>סניף פעיל</span><select className="input" value={branchId} onChange={(event) => setBranchId(event.target.value)}>{permittedBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <div className="scope-explainer"><ShieldCheck /><span><strong>גישה לפי תפקיד</strong><small>בעלים רואה הכול, מנהל סניף רואה את הסניף, ומנהל מחלקה רואה רק מחלקות ששויכו אליו.</small></span></div>
      {canCreate ? <><div><p className="eyebrow">מחלקה חדשה</p><h2>הוספה לסניף</h2></div><label className="field"><span>שם המחלקה</span><input className="input" placeholder="לדוגמה: קבלה" value={name} onChange={(event) => setName(event.target.value)} /></label><button className="button primary" disabled={creating || !branchId} onClick={() => void createDepartment()}>{creating ? <Loader2 className="spin" size={17} /> : <Plus size={17} />} יצירת מחלקה</button></> : null}
      <StatusMessage message={message} kind={kind} />
    </section>
    <div className="departments-content">
      <section className="template-list-card departments-panel">
        <div className="template-list-heading setup-list-heading"><div><p className="eyebrow">{permittedBranches.find((branch) => branch.id === branchId)?.name}</p><h2>{branchDepartments.length} מחלקות</h2></div><span className="status-chip active"><Building2 size={14} /> סניף פעיל</span></div>
        <div className="department-grid">{branchDepartments.map((department) => <article className={`department-card ${department.active ? "" : "inactive"}`} key={department.id}><span className="template-icon"><Network /></span><span><strong>{department.name}</strong><small>{department.active ? "פעילה וניתנת לשיוך" : "מושבתת — ההיסטוריה נשמרת"}</small></span>{canCreate ? <button className="button" aria-pressed={department.active} disabled={busyId === department.id} onClick={() => void toggleDepartment(department)}>{busyId === department.id ? <Loader2 className="spin" size={16} /> : <Power size={16} />}{department.active ? "פעילה" : "כבויה"}</button> : <span className="status-chip active"><Check size={14} /> פעילה</span>}</article>)}</div>
      </section>
      <section className="template-list-card department-access-panel">
        <div className="template-list-heading setup-list-heading"><div><p className="eyebrow">הרשאות הצוות</p><h2>שיוך למחלקות</h2></div><span className="status-chip active"><ShieldCheck size={14} /> מוגן ב־RLS</span></div>
        <div className="department-members">{branchMembers.map((member) => {
          const memberAssignments = new Set(assignments.filter((item) => item.membership_id === member.id).map((item) => item.department_id));
          const displayName = member.profile ? `${member.profile.first_name} ${member.profile.last_name}`.trim() : "חבר/ת צוות";
          return <article className="department-member" key={member.id}><div className="department-member-head"><span className="template-icon"><UserRound /></span><span><strong>{displayName}</strong><small>{roleLabels[member.role]} · {member.access_scope === "branch" ? "כל הסניף" : member.access_scope === "department" ? "מחלקות נבחרות" : "נתונים אישיים"}</small></span></div><div className="department-checkboxes">{branchDepartments.filter((department) => department.active).map((department) => <label className="check-field" key={department.id}><input type="checkbox" checked={memberAssignments.has(department.id)} disabled={busyId === member.id} onChange={(event) => void setMemberDepartment(member, department.id, event.target.checked)} /><span><strong>{department.name}</strong></span></label>)}</div></article>;
        })}{!branchMembers.length ? <div className="empty-template-state"><UserRound size={36} /><p>עדיין אין מנהלים או עובדים בסניף הזה.</p></div> : null}</div>
      </section>
    </div>
  </div>;
}
