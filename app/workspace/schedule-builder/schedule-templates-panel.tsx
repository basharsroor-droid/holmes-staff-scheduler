"use client";

import { useMemo, useState } from "react";
import { CopyPlus, Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Period = {
  id: string;
  branch_id: string;
  department_id: string;
  year: number;
  month: number;
  status: string;
  shift_count: number;
};

type SavedTemplate = {
  id: string;
  branch_id: string;
  department_id: string;
  name: string;
  item_count: number;
  created_at: string;
};

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

export function ScheduleTemplatesPanel({ periods, initialTemplates }: { periods: Period[]; initialTemplates: SavedTemplate[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient() as any, []);
  const router = useRouter();
  const { message, kind, setMessage } = useStatusMessage();
  const [busy, setBusy] = useState("");
  const [sourcePeriodId, setSourcePeriodId] = useState(periods.find((p) => p.shift_count > 0)?.id ?? "");
  const [targetPeriodId, setTargetPeriodId] = useState(periods.find((p) => p.shift_count === 0)?.id ?? "");
  const [templateName, setTemplateName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState(initialTemplates);

  const source = periods.find((p) => p.id === sourcePeriodId);
  const target = periods.find((p) => p.id === targetPeriodId);
  const applicableTemplates = templates.filter((t) => !target || (t.branch_id === target.branch_id && t.department_id === target.department_id));

  async function saveTemplate() {
    if (!sourcePeriodId || !templateName.trim()) {
      setMessage("בחר חודש מקור ותן לתבנית שם.", "error");
      return;
    }
    setBusy("save"); setMessage("");
    const { data, error } = await supabase.rpc("save_schedule_template_from_period", {
      source_period_id: sourcePeriodId,
      template_name: templateName.trim()
    });
    setBusy("");
    if (error || !data) { setMessage("שמירת התבנית נכשלה.", "error"); return; }
    setTemplates((current) => [{
      id: data.id,
      branch_id: data.branch_id,
      department_id: data.department_id,
      name: data.name,
      item_count: source?.shift_count ?? 0,
      created_at: data.created_at
    }, ...current]);
    setTemplateName("");
    setMessage("התבנית נשמרה בלי שיבוצי עובדים ובלי זמינות ישנה.");
  }

  async function applyTemplate() {
    if (!targetPeriodId || !templateId) {
      setMessage("בחר תבנית וחודש יעד ריק.", "error");
      return;
    }
    if (target?.shift_count) {
      setMessage("אפשר להחיל תבנית רק על חודש שאין בו עדיין משמרות.", "error");
      return;
    }
    setBusy("apply"); setMessage("");
    const { data, error } = await supabase.rpc("apply_schedule_template", {
      target_period_id: targetPeriodId,
      target_template_id: templateId
    });
    setBusy("");
    if (error || !data?.length) { setMessage("החלת התבנית נכשלה.", "error"); return; }
    const result = data[0];
    setMessage(`נוצרו ${result.shifts_created} משמרות טיוטה${result.items_skipped ? `, ${result.items_skipped} פריטים דולגו כי אין יום מקביל בחודש` : ""}.`);
    router.refresh();
  }

  async function removeTemplate(id: string) {
    if (!window.confirm("למחוק את התבנית? סידורים שכבר נוצרו ממנה לא יימחקו.")) return;
    setBusy(`delete:${id}`); setMessage("");
    const { error } = await supabase.rpc("delete_schedule_template", { target_template_id: id });
    setBusy("");
    if (error) { setMessage("מחיקת התבנית נכשלה.", "error"); return; }
    setTemplates((current) => current.filter((item) => item.id !== id));
    if (templateId === id) setTemplateId("");
    setMessage("התבנית נמחקה.");
  }

  return <section className="template-list-card" dir="rtl">
    <div className="template-list-heading">
      <div><p className="eyebrow">Schedule Templates</p><h2>תבניות סידור לשימוש חוזר</h2><p>שומרים את מבנה המשמרות בלבד — בלי עובדים, בלי זמינות ישנה ובלי אילוצים אישיים.</p></div>
    </div>

    <div className="grid grid-2" style={{ alignItems: "end" }}>
      <label>חודש מקור
        <select className="input" value={sourcePeriodId} onChange={(e) => setSourcePeriodId(e.target.value)}>
          <option value="">בחר חודש עם משמרות</option>
          {periods.filter((p) => p.shift_count > 0).map((p) => <option key={p.id} value={p.id}>{monthNames[p.month - 1]} {p.year} · {p.shift_count} משמרות</option>)}
        </select>
      </label>
      <label>שם התבנית
        <input className="input" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="למשל: חודש רגיל - קבלה" maxLength={120} />
      </label>
    </div>
    <div className="actions"><button className="button" disabled={!!busy || !sourcePeriodId || !templateName.trim()} onClick={() => void saveTemplate()}>{busy === "save" ? <Loader2 className="spin" size={16}/> : <Save size={16}/>} שמור כתבנית</button></div>

    <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "20px 0" }} />

    <div className="grid grid-2" style={{ alignItems: "end" }}>
      <label>חודש יעד ריק
        <select className="input" value={targetPeriodId} onChange={(e) => { setTargetPeriodId(e.target.value); setTemplateId(""); }}>
          <option value="">בחר חודש ריק</option>
          {periods.filter((p) => p.shift_count === 0).map((p) => <option key={p.id} value={p.id}>{monthNames[p.month - 1]} {p.year}</option>)}
        </select>
      </label>
      <label>תבנית
        <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={!targetPeriodId}>
          <option value="">בחר תבנית מתאימה</option>
          {applicableTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.item_count} משמרות</option>)}
        </select>
      </label>
    </div>
    <div className="actions"><button className="button primary" disabled={!!busy || !targetPeriodId || !templateId} onClick={() => void applyTemplate()}>{busy === "apply" ? <Loader2 className="spin" size={16}/> : <CopyPlus size={16}/>} החל תבנית על החודש</button></div>

    {templates.length ? <div className="grid" style={{ marginTop: 18 }}>
      {templates.map((t) => <div className="card-muted" key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div><strong>{t.name}</strong><p style={{ margin: "4px 0 0" }}>{t.item_count} משמרות בתבנית</p></div>
        <button className="button" disabled={!!busy} onClick={() => void removeTemplate(t.id)}>{busy === `delete:${t.id}` ? <Loader2 className="spin" size={16}/> : <Trash2 size={16}/>} מחיקה</button>
      </div>)}
    </div> : <div className="empty-template-state"><p>עדיין לא נשמרו תבניות.</p></div>}

    <StatusMessage message={message} kind={kind} />
  </section>;
}
