"use client";

import { useState } from "react";
import { Mail, Save } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useStatusMessage } from "@/lib/hooks/use-status-message";

export type PreferenceValues = {
  schedule_published: boolean;
  shift_changes: boolean;
  shift_reminders: boolean;
  availability_reminders: boolean;
  swap_updates: boolean;
};

const labels: Array<{ key: keyof PreferenceValues; title: string; detail: string }> = [
  { key: "schedule_published", title: "פרסום סידור עבודה", detail: "מייל כאשר סידור חדש מתפרסם." },
  { key: "shift_changes", title: "שינויים בשיבוץ", detail: "מייל כאשר מוסיפים או מסירים אותך ממשמרת שפורסמה." },
  { key: "shift_reminders", title: "תזכורת לפני משמרת", detail: "תזכורת כשעה לפני תחילת המשמרת." },
  { key: "availability_reminders", title: "הגשת זמינות", detail: "תזכורת לפני הסגירה והודעה ביום הנעילה." },
  { key: "swap_updates", title: "החלפות משמרת", detail: "בקשות חדשות, אישורים ודחיות." }
];

export function NotificationPreferences({ organizationId, userId, initial }: { organizationId: string; userId: string; initial: PreferenceValues }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { message, kind, setMessage } = useStatusMessage();

  async function save() {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("notification_preferences").upsert({ organization_id: organizationId, user_id: userId, ...values, updated_at: new Date().toISOString() });
    setSaving(false);
    setMessage(error ? "לא הצלחנו לשמור את העדפות המייל." : "העדפות המייל נשמרו.", error ? "error" : "success");
  }

  return <section className="template-list-card" aria-labelledby="email-preferences-title">
    <div className="template-list-heading">
      <div><p className="eyebrow">שליטה אישית</p><h2 id="email-preferences-title"><Mail size={20} /> העדפות מייל</h2></div>
      <button className="button primary" disabled={saving} onClick={() => void save()}><Save size={16} />{saving ? "שומר..." : "שמירה"}</button>
    </div>
    <p>התראות חיוניות לחשבון ולאבטחה ימשיכו להישלח. כאן אפשר לבחור אילו עדכוני עבודה יגיעו גם למייל.</p>
    <div className="notification-preferences-list">
      {labels.map((item) => <label className="notification-preference" key={item.key}>
        <span><strong>{item.title}</strong><small>{item.detail}</small></span>
        <input type="checkbox" checked={values[item.key]} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.checked }))} aria-label={`קבלת מייל: ${item.title}`} />
      </label>)}
    </div>
    {message ? <p className={`form-message ${kind}`} role="status">{message}</p> : null}
  </section>;
}
