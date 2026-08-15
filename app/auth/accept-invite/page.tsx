"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
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

    async function resolveSession() {
      // Admin-generated invite links (auth.admin.inviteUserByEmail) redirect
      // back with the session as access_token/refresh_token in the URL hash
      // (the classic implicit-style /verify redirect). This client is
      // hard-configured to flowType "pkce" (see lib/supabase/browser.ts),
      // and its automatic detectSessionInUrl explicitly REJECTS hash-based
      // callback URLs when flowType is pkce -- it throws "Not a valid PKCE
      // flow url" rather than reading them. So getUser() alone would always
      // report "not signed in" here. Parse the hash ourselves and hand the
      // tokens to setSession(), which has no such flow-type gate.
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      const { data, error } = await supabase.auth.getUser();
      setStage(invitationToken && !error && data.user ? "form" : "invalid");
    }

    void resolveSession();
  }, [supabase]);

  async function acceptInvitation() {
    setMessage("");
    if (password.length < 8) { setMessage("הסיסמה חייבת להכיל לפחות 8 תווים."); return; }
    if (password !== confirmation) { setMessage("הסיסמאות אינן זהות."); return; }
    setBusy(true);
    // Validate the invitation (including the email-match check) BEFORE
    // touching the password. The account behind this browser session isn't
    // guaranteed to be the invited user -- e.g. a shared browser where
    // someone else is already logged in -- so updateUser() must never run
    // until we know this really is the right account.
    const { error } = await supabase.rpc("accept_organization_invitation", { invitation_token: token });
    if (error) {
      setBusy(false);
      setMessage(error.message.includes("email does not match") ? "ההזמנה שייכת לכתובת מייל אחרת." : "ההזמנה אינה תקפה, בוטלה או פגה.");
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (passwordError) {
      setMessage("ההצטרפות הצליחה, אך לא הצלחנו לשמור את הסיסמה. אפשר להגדיר סיסמה דרך \"שכחתי סיסמה\" במסך הכניסה.");
      return;
    }
    setStage("done");
  }

  return <main className="onboarding-page auth-flow auth-invite" dir="rtl">
    <section className="onboarding-intro auth-flow-intro"><BrandLogo href="/" /><p className="eyebrow">הצטרפות לצוות</p><h1>ברוכים הבאים ל־ShiftPilot.</h1><p className="lead">נשלים את פתיחת החשבון ונחבר אותך רק לעסק ולסניף שאליהם הוזמנת.</p></section>
    <section className="auth-card onboarding-card auth-flow-card">
      {stage === "checking" ? <div className="onboarding-state"><Loader2 className="spin" size={38} /><p>בודקים את ההזמנה...</p></div> : null}
      {stage === "invalid" ? <div className="onboarding-state"><UserPlus size={48} /><h2>ההזמנה אינה זמינה</h2><p>הקישור פג תוקף, בוטל או כבר נוצל. פנה למנהל כדי לקבל הזמנה חדשה.</p><Link className="button" href="/login">למסך הכניסה</Link></div> : null}
      {stage === "form" ? <div className="grid"><div><p className="eyebrow"><ShieldCheck size={15} /> המייל אומת</p><h2>יצירת סיסמה והצטרפות</h2></div><label className="field"><span>סיסמה חדשה</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="field"><span>אימות הסיסמה</span><input className="input" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><button className="button primary" disabled={busy} onClick={() => void acceptInvitation()}>{busy ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />} הצטרפות לצוות</button>{message ? <p className="auth-message" role="alert">{message}</p> : null}</div> : null}
      {stage === "done" ? <div className="onboarding-state"><CheckCircle2 size={50} /><h2>הצטרפת בהצלחה</h2><p>החשבון מחובר לעסק ולסניף שלך.</p><Link className="button primary" href="/workspace">כניסה לסביבת העבודה</Link></div> : null}
    </section>
  </main>;
}
