"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { BrandLogo } from "@/components/brand/brand-logo";
import { isNativeApp } from "@/lib/native-app";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { resolveLoginEmail } from "@/lib/auth-config";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  // Inside the wrapped app this screen IS the front door (see app/app/page.tsx)
  // -- the logo shouldn't link back to "/" there, since that's the full
  // marketing site the app is explicitly built to skip. Checked client-side
  // only (see lib/native-app.ts) so regular browser visitors are completely
  // unaffected; starts false to match the server-rendered markup exactly,
  // then flips after mount once navigator.userAgent is available.
  const [nativeApp, setNativeApp] = useState(false);
  useEffect(() => setNativeApp(isNativeApp()), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Fallback for signInWithPassword: reads the input's live DOM value at
  // submit time, in case something set it without going through onChange
  // (see the comment on PasswordField -- WebKit autofill and some
  // accessibility-driven text insertion do this, leaving the visible field
  // correct but this component's `password` state stale).
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // MFA is per-user (supabase.auth.mfa), checked only after a password
  // succeeds -- most accounts never enroll (see /workspace/security,
  // /support/security), so this step stays invisible for them.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function completeLogin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("משהו השתבש בכניסה. נסו שוב.");
      return;
    }
    const { data: supportAgent } = await supabase.from("platform_support_agents")
      .select("user_id").eq("user_id", user.id).maybeSingle();
    router.replace(supportAgent ? "/support" : "/workspace");
    router.refresh();
  }

  async function login() {
    setMessage("");
    const actualPassword = passwordInputRef.current?.value ?? password;
    if (!email || !actualPassword) {
      setMessage("יש להזין כתובת מייל וסיסמה.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: resolveLoginEmail(email), password: actualPassword });

    if (error) {
      setBusy(false);
      setMessage("פרטי הכניסה אינם נכונים או שהמייל עדיין לא אומת.");
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factor = factorsData?.totp.find((item) => item.status === "verified");
      setBusy(false);
      if (!factor) {
        setMessage("החשבון דורש אימות דו-שלבי, אבל לא הצלחנו לטעון את פרטיו. נסו שוב.");
        return;
      }
      setMfaFactorId(factor.id);
      return;
    }

    setBusy(false);
    void completeLogin();
  }

  async function verifyMfa() {
    if (!mfaFactorId || mfaCode.trim().length < 6) {
      setMessage("יש להזין את הקוד בן 6 הספרות מהאפליקציה.");
      return;
    }
    setMessage("");
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode.trim() });
    setBusy(false);
    if (error) {
      setMessage("הקוד שגוי או שפג תוקפו. נסו שוב.");
      return;
    }
    void completeLogin();
  }

  return (
    <main className="onboarding-page auth-flow auth-login" dir="rtl">
      <section className="onboarding-intro auth-flow-intro">
        <BrandLogo href={nativeApp ? undefined : "/"} light />
        <h1>טוב לראות אותך שוב.</h1>
        <p className="lead">כניסה מאובטחת לסביבת העסק, הצוות וסידורי העבודה.</p>
        <div className="onboarding-benefits">
          <div><ShieldCheck /><span><strong>המידע של העסק נשאר פרטי</strong><small>הרשאות וגישה נפרדות לכל ארגון</small></span></div>
        </div>
      </section>

      <section className="auth-card onboarding-card auth-flow-card">
        {mfaFactorId ? (
          <div className="grid">
            <div><p className="eyebrow">שלב אחרון</p><h2>אימות דו-שלבי</h2></div>
            <p className="lead">הזינו את הקוד בן 6 הספרות מאפליקציית האימות שלכם.</p>
            <label className="field">
              <span>קוד אימות</span>
              <input
                className="input"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))}
                onKeyDown={(event) => { if (event.key === "Enter") void verifyMfa(); }}
              />
            </label>
            <button className="button primary" disabled={busy} onClick={verifyMfa}>{busy ? <Loader2 className="spin" size={17} /> : <KeyRound size={17} />} אימות וכניסה</button>
            {message ? <p className="auth-message" role="alert">{message}</p> : null}
          </div>
        ) : (
          <div className="grid">
            <div><h2>כניסה למערכת</h2></div>
            <label className="field"><span>כתובת מייל</span><input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <PasswordField ref={passwordInputRef} label="סיסמה" autoComplete="current-password" value={password} onChange={setPassword} onEnter={() => void login()} />
            <div className="auth-forgot-link"><Link className="auth-secondary" href="/auth/forgot-password">שכחתי סיסמה</Link></div>
            <button className="button primary" disabled={busy} onClick={login}>{busy ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />} כניסה מאובטחת</button>
            {message ? <p className="auth-message" role="alert">{message}</p> : null}
            <p className="auth-secondary">עדיין אין לך חשבון? <Link href="/onboarding">פתיחת סביבת עבודה</Link></p>
            <p className="auth-legal"><Link href="/terms">תנאי שימוש</Link><span>·</span><Link href="/privacy">מדיניות פרטיות</Link></p>
          </div>
        )}
      </section>
    </main>
  );
}
