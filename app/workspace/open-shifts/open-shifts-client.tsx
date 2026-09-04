"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Store, XCircle } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type OpenShift = {
  id: string;
  shift_date: string;
  name: string;
  start_time: string;
  end_time: string;
  branch_name: string;
  department_name: string;
  requested: boolean;
  request_id: string | null;
  request_status: string | null;
};

type Eligibility = { eligible: boolean; reason: string | null; loading?: boolean };

function eligibilityReason(reason: string | null) {
  if (!reason) return "לא ניתן לבקש את המשמרת כרגע.";
  if (reason.includes("approved time off")) return "יש לך Time Off מאושר בתאריך הזה.";
  if (reason.includes("not available")) return "לא הוגשה זמינות מתאימה למשמרת הזו.";
  if (reason.includes("overlapping shift")) return "המשמרת חופפת לשיבוץ קיים שלך.";
  if (reason.includes("Weekly hours")) return "המשמרת תחרוג ממגבלת השעות השבועית שלך.";
  if (reason.includes("Minimum rest")) return "המשמרת לא משאירה את זמן המנוחה המינימלי הנדרש.";
  if (reason.includes("already assigned")) return "את/ה כבר משובץ/ת למשמרת הזו.";
  if (reason.includes("fully staffed")) return "המשמרת כבר אוישה במלואה.";
  if (reason.includes("department")) return "המשמרת אינה במחלקה שאליה את/ה משויך/ת.";
  if (reason.includes("not open")) return "המשמרת כבר אינה פתוחה לבקשות.";
  return "המשמרת אינה עומדת כרגע בכללי הזכאות שלך.";
}

export function OpenShiftsClient({ initialShifts }: { initialShifts: OpenShift[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shifts, setShifts] = useState(initialShifts);
  const [busy, setBusy] = useState("");
  const [eligibility, setEligibility] = useState<Record<string, Eligibility>>(() => Object.fromEntries(initialShifts.map((shift) => [shift.id, { eligible: false, reason: null, loading: true }])));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { message, kind, setMessage } = useStatusMessage();

  useEffect(() => {
    let active = true;
    async function loadEligibility() {
      const entries = await Promise.all(shifts.map(async (shift) => {
        if (shift.requested) return [shift.id, { eligible: true, reason: null, loading: false } as Eligibility] as const;
        const { data, error } = await (supabase as any).rpc("check_open_shift_eligibility", { target_shift_id: shift.id });
        const result: Eligibility = error
          ? { eligible: false, reason: error.message, loading: false }
          : { eligible: !!data?.eligible, reason: data?.reason ?? null, loading: false };
        return [shift.id, result] as const;
      }));
      if (active) setEligibility(Object.fromEntries(entries));
    }
    void loadEligibility();
    return () => { active = false; };
  }, [shifts.length, supabase]);

  async function requestShift(shiftId: string) {
    setBusy(`request-${shiftId}`);
    setMessage("");
    const { data, error } = await (supabase as any).rpc("request_open_shift", {
      target_shift_id: shiftId,
      request_note: notes[shiftId]?.trim() || null
    });
    setBusy("");
    if (error || !data) {
      setMessage(error?.message ? eligibilityReason(error.message) : "שליחת הבקשה נכשלה. ייתכן שהמשמרת כבר אוישה או נסגרה לבקשות.", "error");
      return;
    }
    setShifts((current) => current.map((item) => item.id === shiftId ? {
      ...item,
      requested: true,
      request_id: data.id,
      request_status: data.status
    } : item));
    setMessage("הבקשה נשלחה למנהל לאישור. הסידור עדיין לא השתנה.");
  }

  async function cancelRequest(shiftId: string, requestId: string) {
    setBusy(`cancel-${shiftId}`);
    setMessage("");
    const { error } = await (supabase as any).rpc("cancel_open_shift_request", {
      target_request_id: requestId
    });
    setBusy("");
    if (error) {
      setMessage("ביטול הבקשה נכשל.", "error");
      return;
    }
    setShifts((current) => current.map((item) => item.id === shiftId ? {
      ...item,
      requested: false,
      request_id: null,
      request_status: "cancelled"
    } : item));
    setMessage("הבקשה בוטלה.");
  }

  if (!shifts.length) {
    return <section className="template-list-card"><div className="empty-template-state"><Store size={42} /><h2>אין כרגע הזדמנויות פתוחות</h2><p>כשמנהל יפתח משמרת לאיוש, היא תופיע כאן ב־Shift Marketplace.</p></div></section>;
  }

  return <section className="template-list-card">
    <div className="template-list-heading"><div><p className="eyebrow">Phase 3 · WOW Features</p><h2><Store size={20} /> Shift Marketplace</h2><p>המערכת בודקת את הזכאות שלך לפני שליחת בקשה. בקשה מאושרת רק אחרי בדיקה נוספת ואישור מנהל.</p></div></div>
    <div className="grid">
      {shifts.map((shift) => {
        const check = eligibility[shift.id] ?? { eligible: false, reason: null, loading: true };
        return <article className="card-muted" key={shift.id}>
          <div className="shift-title"><span>{shift.name}</span><small>{new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}</small></div>
          <p>{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)} · {shift.branch_name} · {shift.department_name}</p>

          {shift.requested
            ? <div className="status-chip warning"><CheckCircle2 size={14} /> בקשה ממתינה לאישור מנהל</div>
            : check.loading
              ? <div className="status-chip"><Loader2 className="spin" size={14} /> בודק זכאות...</div>
              : check.eligible
                ? <div className="status-chip success"><ShieldCheck size={14} /> מתאים לכללי הזכאות שלך</div>
                : <div className="status-chip warning"><AlertTriangle size={14} /> {eligibilityReason(check.reason)}</div>}

          {!shift.requested && check.eligible ? <label className="field-label">הערה למנהל (אופציונלי)
            <input
              value={notes[shift.id] ?? ""}
              maxLength={240}
              placeholder="למשל: אשמח לקחת את המשמרת"
              onChange={(event) => setNotes((current) => ({ ...current, [shift.id]: event.target.value }))}
            />
          </label> : null}

          <div className="actions">
            {shift.requested && shift.request_id
              ? <button className="button danger" disabled={!!busy} onClick={() => void cancelRequest(shift.id, shift.request_id!)}>{busy === `cancel-${shift.id}` ? <Loader2 className="spin" size={16} /> : <XCircle size={16} />} ביטול בקשה</button>
              : <button className="button primary" disabled={!!busy || check.loading || !check.eligible} onClick={() => void requestShift(shift.id)}>{busy === `request-${shift.id}` ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} בקש/י את המשמרת</button>}
          </div>
        </article>;
      })}
    </div>
    <StatusMessage message={message} kind={kind} />
  </section>;
}
