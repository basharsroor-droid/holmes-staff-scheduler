"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff, Smartphone, Trash2 } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Factor = { id: string; friendly_name: string | null; factor_type: string; status: string; created_at: string };

// Shared between /workspace/security (org members) and /support/security
// (platform support agents) -- MFA is per-user in Supabase Auth, not
// per-org, so the same enroll/verify/unenroll flow works for both. Built
// for track P0/P1-04 from the security plan, which asks for MFA on
// owners/admins/managers and support agents first (the accounts with the
// broadest access), not necessarily every employee.
export function SecuritySettings() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { message, kind, setMessage } = useStatusMessage();

  async function loadFactors() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setLoading(false);
    if (error) {
      setMessage("לא הצלחנו לטעון את פרטי האימות הדו-שלבי.", "error");
      return;
    }
    setFactors((data.totp ?? []) as Factor[]);
  }

  useEffect(() => {
    void loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) {
      setMessage("לא הצלחנו להתחיל את ההרשמה. נסו שוב.", "error");
      return;
    }
    setPendingFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  function cancelEnroll() {
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setPendingFactorId(null);
    setCode("");
  }

  async function verifyEnroll() {
    if (!pendingFactorId || code.trim().length < 6) {
      setMessage("יש להזין את הקוד בן 6 הספרות מהאפליקציה.", "error");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pendingFactorId, code: code.trim() });
    setBusy(false);
    if (error) {
      setMessage("הקוד שגוי או שפג תוקפו. ודאו שהאפליקציה מסונכרנת ונסו שוב.", "error");
      return;
    }
    setMessage("אימות דו-שלבי הופעל בהצלחה. בכניסה הבאה יידרש קוד מהאפליקציה.", "success");
    cancelEnroll();
    void loadFactors();
  }

  async function removeFactor(factor: Factor) {
    if (!window.confirm("להסיר את שיטת האימות הדו-שלבי? הכניסה הבאה לא תדרוש קוד נוסף, עד שתפעילו מחדש.")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) {
      setMessage("לא הצלחנו להסיר את שיטת האימות.", "error");
      return;
    }
    setMessage("אימות דו-שלבי הוסר מהחשבון.", "success");
    void loadFactors();
  }

  const verifiedFactor = (factors ?? []).find((factor) => factor.status === "verified");

  return (
    <section className="template-list-card security-settings-card" aria-labelledby="security-settings-title">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">אבטחת חשבון</p>
          <h2 id="security-settings-title"><ShieldCheck size={20} /> אימות דו-שלבי (MFA)</h2>
        </div>
      </div>
      <p>
        שכבת הגנה נוספת מעבר לסיסמה — אפליקציית אימות (כמו Google Authenticator
        או Authy) מפיקה קוד בן 6 ספרות שמתחלף כל כמה שניות, ותידרשו להזין אותו
        בכניסה למערכת. מומלץ במיוחד לבעלים, מנהלים ונציגי תמיכה, שיש להם
        הרשאות רחבות.
      </p>

      {loading ? (
        <p className="card-muted">בודקים את מצב האימות הדו-שלבי בחשבון...</p>
      ) : verifiedFactor ? (
        <div className="security-factor-row">
          <span className="security-factor-info">
            <ShieldCheck size={16} color="var(--primary)" />
            <span>
              <strong>אימות דו-שלבי פעיל</strong>
              <small>הופעל {new Date(verifiedFactor.created_at).toLocaleDateString("he-IL")}</small>
            </span>
          </span>
          <button className="button danger" disabled={busy} onClick={() => void removeFactor(verifiedFactor)}>
            <Trash2 size={15} /> הסרה
          </button>
        </div>
      ) : enrolling ? (
        <div className="security-enroll-flow">
          <div className="security-enroll-steps">
            <p>
              <strong>1.</strong> סרקו את הקוד עם אפליקציית אימות, או הזינו את
              המפתח ידנית.
            </p>
            {qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from Supabase, not an app asset Next/Image can optimize
              <img src={qrCode} alt="קוד QR להפעלת אימות דו-שלבי" width={180} height={180} className="security-qr" />
            ) : null}
            {secret ? <p className="card-muted mono-secret">מפתח ידני: {secret}</p> : null}
            <p><strong>2.</strong> הזינו את הקוד בן 6 הספרות שהאפליקציה מציגה.</p>
            <label className="field">
              <span>קוד אימות</span>
              <input
                className="input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            </label>
          </div>
          <div className="security-enroll-actions">
            <button className="button primary" disabled={busy} onClick={() => void verifyEnroll()}>
              <KeyRound size={15} /> אימות והפעלה
            </button>
            <button className="button" disabled={busy} onClick={cancelEnroll}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button className="button primary" disabled={busy} onClick={() => void startEnroll()}>
          <Smartphone size={15} /> הפעלת אימות דו-שלבי
        </button>
      )}

      {!loading && !verifiedFactor && !enrolling ? (
        <p className="card-muted security-off-note">
          <ShieldOff size={14} /> לא פעיל כרגע בחשבון הזה.
        </p>
      ) : null}

      <StatusMessage message={message} kind={kind} />
    </section>
  );
}
