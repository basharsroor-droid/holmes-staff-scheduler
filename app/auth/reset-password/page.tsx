"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stage = "checking" | "form" | "expired" | "done";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      setStage(!error && data.user ? "form" : "expired");
    });
  }, [supabase]);

  async function savePassword() {
    setMessage("");
    if (password.length < 8) {
      setMessage("הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }
    if (password !== confirmation) {
      setMessage("הסיסמאות אינן זהות.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setMessage("לא הצלחנו לעדכן את הסיסמה. ייתכן שהקישור פג תוקף.");
      return;
    }
    setPassword("");
    setConfirmation("");
    setStage("done");
  }

  return (
    <main className="onboarding-page" dir="rtl">
      <section className="onboarding-intro">
        <div className="brand-mark">SP</div>
        <p className="eyebrow">SHIFT PILOT</p>
        <h1>בחירת סיסמה חדשה.</h1>
        <p className="lead">הסיסמה נשמרת באופן מאובטח ב־Supabase ואינה נחשפת למנהלים או לעובדי ShiftPilot.</p>
      </section>
      <section className="auth-card onboarding-card">
        {stage === "checking" ? <div className="onboarding-state"><Loader2 className="spin" size={38} /><p>בודקים את קישור האיפוס...</p></div> : null}
        {stage === "expired" ? (
          <div className="onboarding-state">
            <KeyRound size={48} /><h2>הקישור אינו תקף</h2>
            <p>הקישור פג תוקף או שכבר נעשה בו שימוש. בקש קישור חדש ופתח רק את ההודעה האחרונה.</p>
            <Link className="button primary" href="/auth/forgot-password">שליחת קישור חדש</Link>
          </div>
        ) : null}
        {stage === "form" ? (
          <div className="grid">
            <div><p className="eyebrow"><ShieldCheck size={15} /> חיבור מאומת</p><h2>הגדרת סיסמה חדשה</h2></div>
            <label className="field"><span>סיסמה חדשה</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label className="field"><span>אימות הסיסמה</span><input className="input" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void savePassword(); }} /></label>
            <button className="button primary" disabled={busy} onClick={savePassword}>{busy ? <Loader2 className="spin" size={17} /> : <KeyRound size={17} />} שמירת הסיסמה</button>
            {message ? <p className="auth-message" role="alert">{message}</p> : null}
          </div>
        ) : null}
        {stage === "done" ? (
          <div className="onboarding-state">
            <CheckCircle2 size={50} /><h2>הסיסמה עודכנה</h2><p>אפשר להיכנס עכשיו לחשבון באמצעות הסיסמה החדשה.</p>
            <Link className="button primary" href="/login">כניסה ל־ShiftPilot</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
