"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function sendRecovery() {
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage("יש להזין כתובת מייל תקינה.");
      return;
    }

    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    setBusy(false);

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        setMessage("נשלחו יותר מדי בקשות. המתן מעט ונסה שוב פעם אחת.");
      } else {
        setMessage("לא הצלחנו לשלוח את הקישור כרגע. נסה שוב מאוחר יותר.");
      }
      return;
    }
    setSent(true);
  }

  return (
    <main className="onboarding-page auth-flow auth-recovery" dir="rtl">
      <section className="onboarding-intro auth-flow-intro">
        <BrandLogo href="/" light />
        <p className="eyebrow">שחזור גישה מאובטח</p>
        <h1>חוזרים לחשבון בכמה צעדים.</h1>
        <p className="lead">נשלח קישור חד־פעמי לכתובת המייל של החשבון. הקישור מיועד רק להגדרת סיסמה חדשה.</p>
      </section>
      <section className="auth-card onboarding-card auth-flow-card">
        {sent ? (
          <div className="onboarding-state">
            <CheckCircle2 size={48} />
            <h2>בדוק את תיבת המייל</h2>
            <p>אם קיים חשבון עם הכתובת שהזנת, נשלח אליו קישור. פתח רק את ההודעה החדשה ביותר.</p>
            <Link className="button" href="/login">חזרה למסך הכניסה</Link>
          </div>
        ) : (
          <div className="grid">
            <div><p className="eyebrow"><KeyRound size={15} /> שכחתי סיסמה</p><h2>שליחת קישור איפוס</h2></div>
            <label className="field">
              <span>כתובת המייל של החשבון</span>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendRecovery(); }} />
            </label>
            <button className="button primary" disabled={busy} onClick={sendRecovery}>
              {busy ? <Loader2 className="spin" size={17} /> : <Mail size={17} />} שליחת קישור מאובטח
            </button>
            {message ? <p className="auth-message" role="alert">{message}</p> : null}
            <p className="auth-secondary">נזכרת בסיסמה? <Link href="/login">חזרה לכניסה</Link></p>
          </div>
        )}
      </section>
    </main>
  );
}
