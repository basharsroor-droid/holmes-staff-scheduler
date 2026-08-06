"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stage = "checking" | "form" | "invalid" | "done";

export default function AcceptInvitePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stage, setStage] = useState<Stage>("checking");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(invitationToken);
    supabase.auth.getUser().then(({ data, error }) => setStage(invitationToken && !error && data.user ? "form" : "invalid"));
  }, [supabase]);

  async function acceptInvitation() {
    setMessage("");
    if (password.length < 8) { setMessage("הסיסמה חייבת להכיל לפחות 8 תווים."); return; }
    if (password !== confirmation) { setMessage("הסיסמאות אינן זהות."); return; }
    setBusy(true);
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) { setBusy(false); setMessage("לא הצלחנו לשמור את הסיסמה."); return; }
    const { error } = await supabase.rpc("accept_organization_invitation", { invitation_token: token });
    setBusy(false);
    if (error) {
      setMessage(error.message.includes("email does not match") ? "ההזמנה שייכת לכתובת מייל אחרת." : "ההזמנה אינה תקפה, בוטלה או פגה.");
      return;
    }
    setStage("done");
  }

  return <main className="onboarding-page" dir="rtl">
    <section className="onboarding-intro"><div className="brand-mark">SP</div><p className="eyebrow">הצטרפות לצוות</p><h1>ברוכים הבאים ל־ShiftPilot.</h1><p className="lead">נשלים את פתיחת החשבון ונחבר אותך רק לעסק ולסניף שאליהם הוזמנת.</p></section>
    <section className="auth-card onboarding-card">
      {stage === "checking" ? <div className="onboarding-state"><Loader2 className="spin" size={38} /><p>בודקים את ההזמנה...</p></div> : null}
      {stage === "invalid" ? <div className="onboarding-state"><UserPlus size={48} /><h2>ההזמנה אינה זמינה</h2><p>הקישור פג תוקף, בוטל או כבר נוצל. פנה למנהל כדי לקבל הזמנה חדשה.</p><Link className="button" href="/login">למסך הכניסה</Link></div> : null}
      {stage === "form" ? <div className="grid"><div><p className="eyebrow"><ShieldCheck size={15} /> המייל אומת</p><h2>יצירת סיסמה והצטרפות</h2></div><label className="field"><span>סיסמה חדשה</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="field"><span>אימות הסיסמה</span><input className="input" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><button className="button primary" disabled={busy} onClick={() => void acceptInvitation()}>{busy ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />} הצטרפות לצוות</button>{message ? <p className="auth-message" role="alert">{message}</p> : null}</div> : null}
      {stage === "done" ? <div className="onboarding-state"><CheckCircle2 size={50} /><h2>הצטרפת בהצלחה</h2><p>החשבון מחובר לעסק ולסניף שלך.</p><Link className="button primary" href="/workspace">כניסה לסביבת העבודה</Link></div> : null}
    </section>
  </main>;
}
