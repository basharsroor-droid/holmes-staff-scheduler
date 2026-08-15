"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Loader2, Plus, Power, ShieldCheck, Users } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Branch = { id: string; name: string };
type Department = { id: string; branch_id: string; name: string };
type ShiftTemplate = {
  id: string;
  branch_id: string;
  department_id: string;
  name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  required_employees: number;
  requires_senior_employee: boolean;
  active: boolean;
};

const emptyForm = {
  name: "",
  shiftType: "custom",
  startTime: "08:00",
  endTime: "16:00",
  requiredEmployees: 1,
  requiresSenior: false
};

export function ShiftTemplatesClient({
  organizationId,
  branches,
  departments,
  selectedBranchId,
  initialTemplates
}: {
  organizationId: string;
  branches: Branch[];
  departments: Department[];
  selectedBranchId: string;
  initialTemplates: ShiftTemplate[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [templates, setTemplates] = useState(initialTemplates);
  const [branchId, setBranchId] = useState(selectedBranchId);
  const [departmentId, setDepartmentId] = useState(departments.find((item) => item.branch_id === selectedBranchId)?.id ?? "");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const { message, kind, setMessage } = useStatusMessage();

  const branchDepartments = departments.filter((department) => department.branch_id === branchId);
  const departmentTemplates = templates.filter((template) => template.department_id === departmentId);

  function selectBranch(nextBranchId: string) {
    setBranchId(nextBranchId);
    setDepartmentId(departments.find((department) => department.branch_id === nextBranchId)?.id ?? "");
  }

  async function addTemplate() {
    setMessage("");
    if (!branchId || !departmentId) { setMessage("יש לבחור סניף ומחלקה.", "error"); return; }
    if (form.name.trim().length < 2 || !form.startTime || !form.endTime) {
      setMessage("יש להזין שם משמרת ושעות התחלה וסיום.", "error");
      return;
    }
    if (form.startTime === form.endTime) {
      setMessage("שעת ההתחלה ושעת הסיום אינן יכולות להיות זהות.", "error");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase
      .from("shift_templates")
      .insert({
        organization_id: organizationId,
        branch_id: branchId,
        department_id: departmentId,
        name: form.name.trim(),
        shift_type: form.shiftType,
        start_time: form.startTime,
        end_time: form.endTime,
        required_employees: form.requiredEmployees,
        requires_senior_employee: form.requiresSenior
      })
      .select("id, branch_id, department_id, name, shift_type, start_time, end_time, required_employees, requires_senior_employee, active")
      .single();
    setBusy(false);

    if (error || !data) {
      setMessage(error?.message.includes("duplicate") ? "כבר קיימת משמרת בשם הזה בסניף." : "לא הצלחנו לשמור את המשמרת. נסה שוב.", "error");
      return;
    }

    setTemplates((current) => [...current, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setForm(emptyForm);
    setMessage("המשמרת נשמרה בהצלחה.");
  }

  async function toggleTemplate(template: ShiftTemplate) {
    setMessage("");
    const nextActive = !template.active;
    const { error } = await supabase
      .from("shift_templates")
      .update({ active: nextActive })
      .eq("id", template.id)
      .eq("organization_id", organizationId);

    if (error) {
      setMessage("לא הצלחנו לעדכן את המשמרת.", "error");
      return;
    }
    setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, active: nextActive } : item));
  }

  return (
    <section className="template-workbench business-setup-workbench shift-template-workbench">
      <div className="template-form-card setup-form-card shift-template-form">
        <div><p className="eyebrow">משמרת חדשה</p><h2>הוספת סוג משמרת</h2></div>
        {branches.length > 1
          ? <label className="field"><span>סניף</span><select className="input" value={branchId} onChange={(event) => selectBranch(event.target.value)}>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>
          : null}
        <label className="field"><span>מחלקה</span><select className="input" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{branchDepartments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label>
        <label className="field"><span>שם המשמרת</span><input className="input" placeholder="לדוגמה: פתיחה" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
        <div className="form-pair">
          <label className="field"><span>שעת התחלה</span><input className="input" type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></label>
          <label className="field"><span>שעת סיום</span><input className="input" type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></label>
        </div>
        <div className="form-pair">
          <label className="field"><span>סוג</span><select className="input" value={form.shiftType} onChange={(event) => setForm((current) => ({ ...current, shiftType: event.target.value }))}><option value="opening">פתיחה</option><option value="middle">אמצע</option><option value="closing">סגירה</option><option value="custom">אחר</option></select></label>
          <label className="field"><span>מספר עובדים דרוש</span><input className="input" type="number" min={1} max={100} value={form.requiredEmployees} onChange={(event) => setForm((current) => ({ ...current, requiredEmployees: Number(event.target.value) || 1 }))} /></label>
        </div>
        <label className="check-field"><input type="checkbox" checked={form.requiresSenior} onChange={(event) => setForm((current) => ({ ...current, requiresSenior: event.target.checked }))} /><span><strong>נדרש עובד בכיר</strong><small>המערכת תתריע אם אין במשמרת עובד ותיק או אחראי.</small></span></label>
        <button className="button primary" disabled={busy || !branchId || !departmentId} onClick={addTemplate}>{busy ? <Loader2 className="spin" size={17} /> : <Plus size={17} />} שמירת משמרת</button>
        <StatusMessage message={message} kind={kind} />
      </div>

      <div className="template-list-card setup-list-card shift-template-list-card">
        <div className="template-list-heading setup-list-heading"><div><p className="eyebrow">{branches.find((branch) => branch.id === branchId)?.name ?? "הסניף"} · {branchDepartments.find((department) => department.id === departmentId)?.name ?? "מחלקה"}</p><h2>{departmentTemplates.length ? `${departmentTemplates.length} סוגי משמרות` : "עדיין לא הוגדרו משמרות"}</h2></div><span className="status-chip active"><Check size={14} /> נשמר ב־Supabase</span></div>
        <div className="template-list">
          {departmentTemplates.map((template) => (
            <article className={`template-item shift-template-row ${template.active ? "" : "inactive"}`} key={template.id}>
              <div className="template-icon"><Clock3 /></div>
              <div className="template-main"><strong>{template.name}</strong><span>{template.start_time.slice(0, 5)}–{template.end_time.slice(0, 5)}</span></div>
              <div className="template-meta"><span><Users size={15} /> {template.required_employees} עובדים</span>{template.requires_senior_employee ? <span><ShieldCheck size={15} /> עובד בכיר</span> : null}</div>
              <button className="button" aria-pressed={template.active} onClick={() => void toggleTemplate(template)}><Power size={16} /> {template.active ? "פעילה" : "כבויה"}</button>
            </article>
          ))}
          {!departmentTemplates.length ? <div className="empty-template-state"><Clock3 size={36} /><p>הוסף את המשמרת הראשונה כדי להתחיל לבנות חודש עבודה.</p></div> : null}
        </div>
      </div>
    </section>
  );
}
