"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, Loader2, Lock, RotateCcw } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type PeriodStatus = Database["public"]["Enums"]["schedule_status"];
type Branch = { id: string; name: string };
type Department = { id: string; branch_id: string; name: string };
type Template = { id: string; branch_id: string; department_id: string; name: string; start_time: string; end_time: string };
type Period = {
  id: string; branch_id: string; department_id: string; year: number; month: number; status: PeriodStatus;
  submission_opens_at: string; submission_closes_at: string; published_at: string | null;
};

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function WorkMonthsClient({
  organizationId, currentUserId, branches, departments, templates, initialPeriods, selectedBranchId
}: {
  organizationId: string; currentUserId: string; branches: Branch[]; departments: Department[]; templates: Template[];
  initialPeriods: Period[]; selectedBranchId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const nextMonth = useMemo(() => { const date = new Date(); date.setMonth(date.getMonth() + 1, 1); return date; }, []);
  const defaultOpen = useMemo(() => new Date(), []);
  const defaultClose = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 10); date.setHours(23, 59, 0, 0); return date; }, []);
  const [periods, setPeriods] = useState(initialPeriods);
  const [form, setForm] = useState({
    branchId: selectedBranchId,
    departmentId: departments.find((department) => department.branch_id === selectedBranchId)?.id ?? "",
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth() + 1,
    opensAt: localDateTime(defaultOpen),
    closesAt: localDateTime(defaultClose)
  });
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { message, kind, setMessage } = useStatusMessage();

  const branchDepartments = departments.filter((department) => department.branch_id === form.branchId);
  const departmentTemplates = templates.filter((template) => template.department_id === form.departmentId);

  function selectBranch(branchId: string) {
    setForm((current) => ({ ...current, branchId, departmentId: departments.find((department) => department.branch_id === branchId)?.id ?? "" }));
  }

  async function createPeriod() {
    setMessage("");
    if (!form.branchId || !form.departmentId || !form.opensAt || !form.closesAt) { setMessage("יש לבחור סניף, מחלקה ותאריכי פתיחה וסגירה.", "error"); return; }
    const opens = new Date(form.opensAt);
    const closes = new Date(form.closesAt);
    if (Number.isNaN(opens.getTime()) || Number.isNaN(closes.getTime()) || closes <= opens) {
      setMessage("מועד סיום ההגשה חייב להיות מאוחר ממועד הפתיחה.", "error"); return;
    }
    if (!departmentTemplates.length) { setMessage("יש להגדיר לפחות סוג משמרת פעיל אחד במחלקה לפני פתיחת חודש.", "error"); return; }

    setBusy(true);
    const { data, error } = await supabase.from("schedule_periods").insert({
      organization_id: organizationId,
      branch_id: form.branchId,
      department_id: form.departmentId,
      year: form.year,
      month: form.month,
      status: "collecting",
      submission_opens_at: opens.toISOString(),
      submission_closes_at: closes.toISOString(),
      created_by: currentUserId
    }).select("id, branch_id, department_id, year, month, status, submission_opens_at, submission_closes_at, published_at").single();
    setBusy(false);

    if (error || !data) {
      setMessage(error?.message.includes("duplicate") ? "כבר קיים חודש עבודה כזה בסניף." : "לא הצלחנו לפתוח את חודש העבודה.", "error");
      return;
    }
    setPeriods((current) => [data, ...current]);
    setMessage("חודש העבודה נפתח בהצלחה להגשת זמינות.");
  }

  async function changeStatus(period: Period, status: PeriodStatus) {
    setBusyId(period.id); setMessage("");
    const { error } = await supabase.from("schedule_periods").update({ status }).eq("id", period.id).eq("organization_id", organizationId);
    setBusyId(null);
    if (error) { setMessage("לא הצלחנו לעדכן את מצב החודש.", "error"); return; }
    setPeriods((current) => current.map((item) => item.id === period.id ? { ...item, status } : item));
    setMessage(status === "collecting" ? "חלון ההגשה נפתח מחדש." : "חלון ההגשה נסגר והחודש עבר להכנת סידור.");
  }

  return <div className="template-workbench business-setup-workbench work-months-workbench">
    <section className="template-form-card setup-form-card work-month-form">
      <div><p className="eyebrow">חודש חדש</p><h2>פתיחת הגשת זמינות</h2></div>
      <div className="form-pair">
        <label className="field"><span>סניף</span><select className="input" value={form.branchId} onChange={(e) => selectBranch(e.target.value)}>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>
        <label className="field"><span>שנה</span><input className="input" type="number" min={2020} max={2100} value={form.year} onChange={(e) => setForm((c) => ({ ...c, year: Number(e.target.value) }))} /></label>
      </div>
      <label className="field"><span>מחלקה</span><select className="input" value={form.departmentId} onChange={(e) => setForm((c) => ({ ...c, departmentId: e.target.value }))}>{branchDepartments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label>
      <label className="field"><span>חודש</span><select className="input" value={form.month} onChange={(e) => setForm((c) => ({ ...c, month: Number(e.target.value) }))}>{monthNames.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}</select></label>
      <label className="field"><span>פתיחת ההגשה</span><input className="input" type="datetime-local" value={form.opensAt} onChange={(e) => setForm((c) => ({ ...c, opensAt: e.target.value }))} /></label>
      <label className="field"><span>דדליין להגשה</span><input className="input" type="datetime-local" value={form.closesAt} onChange={(e) => setForm((c) => ({ ...c, closesAt: e.target.value }))} /></label>
      <div className="card-muted"><strong>{departmentTemplates.length} סוגי משמרות פעילים</strong><p className="auth-secondary">{departmentTemplates.map((template) => `${template.name} ${template.start_time.slice(0,5)}–${template.end_time.slice(0,5)}`).join(" · ") || "לא הוגדרו משמרות"}</p></div>
      <button className="button primary" disabled={busy} onClick={() => void createPeriod()}>{busy ? <Loader2 className="spin" size={17} /> : <CalendarPlus size={17} />} פתיחת חודש עבודה</button>
      <StatusMessage message={message} kind={kind} />
    </section>

    <section className="template-list-card setup-list-card work-months-list">
      <div className="template-list-heading setup-list-heading"><div><p className="eyebrow">תקופות עבודה</p><h2>{periods.length ? `${periods.length} חודשים` : "עדיין לא נפתח חודש"}</h2></div><span className="status-chip active"><CheckCircle2 size={14} /> נשמר ב־Supabase</span></div>
      <div className="template-list">
        {periods.map((period) => {
          const branch = branches.find((item) => item.id === period.branch_id);
          const department = departments.find((item) => item.id === period.department_id);
          const collecting = period.status === "collecting";
          return <article className={`template-item work-month-card period-${period.status} ${period.status === "archived" ? "inactive" : ""}`} key={period.id}>
            <div className="template-icon"><Clock3 /></div>
            <div className="template-main"><strong>{monthNames[period.month - 1]} {period.year}</strong><span>{branch?.name ?? "סניף"} · {department?.name ?? "מחלקה"}</span></div>
            <div className="template-meta"><span>פתיחה: {new Date(period.submission_opens_at).toLocaleDateString("he-IL")}</span><span>דדליין: {new Date(period.submission_closes_at).toLocaleDateString("he-IL")}</span><span className="status-chip">{collecting ? "איסוף זמינות" : period.status === "draft" ? "הכנת סידור" : period.status === "published" ? "פורסם" : "ארכיון"}</span></div>
            {["collecting","draft"].includes(period.status) ? <button className="button" disabled={busyId === period.id} onClick={() => void changeStatus(period, collecting ? "draft" : "collecting")}>{busyId === period.id ? <Loader2 className="spin" size={16} /> : collecting ? <Lock size={16} /> : <RotateCcw size={16} />}{collecting ? "סגירת הגשה" : "פתיחה מחדש"}</button> : null}
          </article>;
        })}
        {!periods.length ? <div className="empty-template-state"><CalendarDays size={38} /><p>פתח את החודש הראשון כדי שהעובדים יוכלו להגיש זמינות.</p></div> : null}
      </div>
    </section>
  </div>;
}
