"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Loader2, LogIn, Mail, ShieldCheck } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { BrandLogo } from "@/components/brand/brand-logo";
import { isNativeApp } from "@/lib/native-app";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { resolveLoginEmail } from "@/lib/auth-config";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [nativeApp, setNativeApp] = useState(false);
  useEffect(() => setNativeApp(isNativeApp()), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function completeLogin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("משהו השתבש בכניסה — נסו שוב");
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
      setMessage("יש להזין כתובת מייל וסיסמה");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: resolveLoginEmail(email), password: actualPassword });

    if (error) {
      setBusy(false);
      setMessage("פרטי הכניסה אינם נכונים או שהמייל עדיין לא אומת");
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factor = factorsData?.totp.find((item) => item.status === "verified");
      setBusy(false);
      if (!factor) {
        setMessage("החשבון דורש אימות דו־שלבי, אבל לא הצלחנו לטעון את פרטיו — נסו שוב");
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
      setMessage("יש להזין את הקוד בן 6 הספרות מהאפליקציה");
      return;
    }
    setMessage("");
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode.trim() });
    setBusy(false);
    if (error) {
      setMessage("הקוד שגוי או שפג תוקפו — נסו שוב");
      return;
    }
    void completeLogin();
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#071d43] text-white" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(38,99,235,0.55),transparent_42%),linear-gradient(180deg,#0b2d64_0%,#071d43_52%,#04132e_100%)]" />
      <motion.div
        className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/25 blur-3xl"
        animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 right-[-4rem] h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl"
        animate={{ y: [0, -28, 0], opacity: [0.2, 0.42, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-5 py-[max(28px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className="mb-6 flex flex-col items-center text-center"
        >
          <motion.div
            className="mb-4 rounded-[26px] border border-white/20 bg-white/95 px-5 py-3 shadow-[0_18px_50px_rgba(1,12,33,0.28)]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <BrandLogo href={nativeApp ? undefined : "/"} />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">ברוכים הבאים ל־ShiftPilot</h1>
          <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-blue-100/75">כניסה מאובטחת לסביבת העבודה, המשמרות והצוות שלך</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.10] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6"
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent"
            animate={{ x: ["-35%", "35%", "-35%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <AnimatePresence mode="wait">
            {mfaFactorId ? (
              <motion.div key="mfa" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="grid gap-4">
                <div className="text-center"><p className="text-xs font-extrabold text-cyan-200">שלב אחרון</p><h2 className="mt-1 text-2xl font-black">אימות דו־שלבי</h2></div>
                <p className="text-center text-sm leading-6 text-blue-100/70">הזינו את הקוד בן 6 הספרות מאפליקציית האימות שלכם</p>
                <label className="grid gap-2 text-sm font-bold">
                  <span>קוד אימות</span>
                  <input
                    className="h-14 rounded-2xl border border-white/15 bg-white/10 px-4 text-center text-xl font-bold tracking-[0.28em] text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/[0.14] focus:ring-4 focus:ring-cyan-300/10"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))}
                    onKeyDown={(event) => { if (event.key === "Enter") void verifyMfa(); }}
                  />
                </label>
                <motion.button whileTap={{ scale: 0.98 }} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white font-black text-[#0b2d64] shadow-lg disabled:opacity-60" disabled={busy} onClick={verifyMfa}>{busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />} אימות וכניסה</motion.button>
                {message ? <p className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-center text-sm text-red-100" role="alert">{message}</p> : null}
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4">
                <div className="text-center">
                  <h2 className="text-2xl font-black">כניסה למערכת</h2>
                  <p className="mt-1 text-sm text-blue-100/65">התחברו לחשבון הקיים שלכם</p>
                </div>

                <label className="grid gap-2 text-sm font-bold">
                  <span>כתובת מייל</span>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-100/45" size={18} />
                    <input
                      className="h-14 w-full rounded-2xl border border-white/15 bg-white/10 pr-11 pl-4 text-base text-white outline-none transition placeholder:text-blue-100/30 focus:border-cyan-300/70 focus:bg-white/[0.14] focus:ring-4 focus:ring-cyan-300/10"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </label>

                <div className="[&_.field]:gap-2 [&_.field>span]:text-sm [&_.field>span]:font-bold [&_.input]:h-14 [&_.input]:rounded-2xl [&_.input]:border-white/15 [&_.input]:bg-white/10 [&_.input]:text-white [&_.input]:shadow-none [&_.input:focus]:border-cyan-300/70 [&_.input:focus]:ring-4 [&_.input:focus]:ring-cyan-300/10">
                  <PasswordField ref={passwordInputRef} label="סיסמה" autoComplete="current-password" value={password} onChange={setPassword} onEnter={() => void login()} />
                </div>

                <div className="flex justify-start"><Link className="text-sm font-bold text-cyan-200 hover:text-white" href="/auth/forgot-password">שכחתי סיסמה</Link></div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={busy}
                  onClick={login}
                  className="relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white font-black text-[#0b2d64] shadow-[0_14px_30px_rgba(0,0,0,0.18)] disabled:opacity-60"
                >
                  <motion.span aria-hidden="true" className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-blue-100/70 to-transparent" animate={{ x: ["-240%", "340%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2 }} />
                  <span className="relative flex items-center gap-2">{busy ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} כניסה מאובטחת</span>
                </motion.button>

                {message ? <p className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-center text-sm text-red-100" role="alert">{message}</p> : null}

                <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs font-semibold text-blue-100/70">
                  <ShieldCheck size={16} className="text-cyan-200" />
                  המידע שלך נשמר בסביבת עבודה מאובטחת
                </div>

                {!nativeApp ? <p className="text-center text-sm text-blue-100/65">עדיין אין לך חשבון? <Link className="font-black text-white underline decoration-cyan-300/60 underline-offset-4" href="/onboarding">פתיחת סביבת עבודה</Link></p> : null}
                <p className="flex justify-center gap-3 text-xs font-semibold text-blue-100/60"><Link href="/terms">תנאי שימוש</Link><span>·</span><Link href="/privacy">מדיניות פרטיות</Link></p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </main>
  );
}
