"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("");
    if (!email || !password) {
      setMessage("יש להזין כתובת מייל וסיסמה.");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setMessage("פרטי הכניסה אינם נכונים או שהמייל עדיין לא אומת.");
      return;
    }

    const { data: supportAgent } = await supabase.from("platform_support_agents")
      .select("user_id").eq("user_id", data.user.id).maybeSingle();
    router.replace(supportAgent ? "/support" : "/workspace");
    router.refresh();
  }

  return (
    <main className="onboarding-page auth-flow auth-login" dir="rtl">
      <section className="onboarding-intro auth-flow-intro">
        <BrandLogo href="/" light />
        <p className="eyebrow">SHIFT PILOT לעסקים</p>
        <h1>טוב לראות אותך שוב.</h1>
        <p className="lead">כניסה מאובטחת לסביבת העסק, הצוות וסידורי העבודה.</p>
        <div className="onboarding-benefits">
          <div><ShieldCheck /><span><strong>המידע של העסק נשאר פרטי</strong><small>הרשאות וגישה נפרדות לכל ארגון</small></span></div>
        </div>
      </section>

      <section className="auth-card onboarding-card auth-flow-card">
        <div className="grid">
          <div><p className="eyebrow">כניסת בעלי עסק ומנהלים</p><h2>כניסה למערכת</h2></div>
          <label className="field"><span>כתובת מייל</span><input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="field"><span>סיסמה</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void login(); }} /></label>
          <div className="auth-forgot-link"><Link className="auth-secondary" href="/auth/forgot-password">שכחתי סיסמה</Link></div>
          <button className="button primary" disabled={busy} onClick={login}>{busy ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />} כניסה מאובטחת</button>
          {message ? <p className="auth-message" role="alert">{message}</p> : null}
          <p className="auth-secondary">עדיין אין לך חשבון? <Link href="/onboarding">פתיחת עסק חדש</Link></p>
          <p className="auth-legal"><Link href="/terms">תנאי שימוש</Link><span>·</span><Link href="/privacy">מדיניות פרטיות</Link></p>
        </div>
      </section>
    </main>
  );
}
