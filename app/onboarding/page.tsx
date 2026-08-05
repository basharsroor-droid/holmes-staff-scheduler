"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stage = "loading" | "account" | "verify" | "workspace" | "done";

export default function OnboardingPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stage, setStage] = useState<Stage>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("סניף ראשי");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStage(data.user ? "workspace" : "account");
      if (data.user) {
        setFirstName(String(data.user.user_metadata?.first_name ?? ""));
        setLastName(String(data.user.user_metadata?.last_name ?? ""));
      }
    });
  }, [supabase]);

  async function createAccount() {
    setMessage("");
    if (!email || password.length < 8 || !firstName.trim()) {
      setMessage("יש למלא שם, כתובת מייל וסיסמה באורך 8 תווים לפחות.");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { first_name: firstName.trim(), last_name: lastName.trim() }
      }
    });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }
    setStage(data.session ? "workspace" : "verify");
  }

  async function createWorkspace() {
    setMessage("");
    if (businessName.trim().length < 2 || branchName.trim().length < 2) {
      setMessage("יש להזין שם עסק ושם סניף.");
      return;
    }

    setBusy(true);
    const slug = `business-${crypto.randomUUID().slice(0, 12)}`;
    const { error } = await supabase.rpc("create_organization_workspace", {
      business_name: businessName.trim(),
      organization_slug: slug,
      first_branch_name: branchName.trim(),
      owner_first_name: firstName.trim() || "בעל העסק",
      owner_last_name: lastName.trim()
    });
    setBusy(false);

    if (error) {
      setMessage(error.message.includes("duplicate") ? "כבר קיימת סביבת עבודה עם הפרטים האלה." : error.message);
      return;
    }
    setStage("done");
  }

  return (
    <main className="onboarding-page" dir="rtl">
      <section className="onboarding-intro">
        <div className="brand-mark">SP</div>
        <p className="eyebrow">SHIFT PILOT לעסקים</p>
        <h1>סביבת העבודה של העסק שלך, מוכנה תוך כמה דקות.</h1>
        <p className="lead">פותחים חשבון עסקי מאובטח, מגדירים את הסניף הראשון ואז מזמינים מנהלים ועובדים.</p>
        <p className="auth-secondary">כבר פתחת חשבון? <Link href="/login">כניסה למערכת</Link></p>
        <div className="onboarding-benefits">
          <div><ShieldCheck /><span><strong>מידע פרטי לכל עסק</strong><small>הפרדה מלאה בין לקוחות והרשאות לפי תפקיד</small></span></div>
          <div><Users /><span><strong>צוות במקום אחד</strong><small>מנהלים, עובדים, זמינות ושיבוצים</small></span></div>
          <div><Building2 /><span><strong>מוכן לגדול</strong><small>אפשרות להוסיף סניפים נוספים בהמשך</small></span></div>
        </div>
      </section>

      <section className="auth-card onboarding-card">
        {stage === "loading" ? <Loading /> : null}

        {stage === "account" ? (
          <div className="grid">
            <div><p className="eyebrow">שלב 1 מתוך 2</p><h2>פתיחת חשבון לבעל העסק</h2></div>
            <div className="form-pair">
              <label className="field"><span>שם פרטי</span><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
              <label className="field"><span>שם משפחה</span><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
            </div>
            <label className="field"><span>מייל עסקי</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field"><span>סיסמה</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="button primary" disabled={busy} onClick={createAccount}>{busy ? <Loader2 className="spin" size={17} /> : null} יצירת חשבון מאובטח</button>
          </div>
        ) : null}

        {stage === "verify" ? (
          <div className="onboarding-state"><CheckCircle2 size={46} /><h2>שלחנו לך מייל אימות</h2><p>יש לאשר את כתובת המייל. לאחר האישור תחזור לכאן כדי להגדיר את העסק.</p><Link className="button" href="/login">כבר אישרתי — כניסה</Link></div>
        ) : null}

        {stage === "workspace" ? (
          <div className="grid">
            <div><p className="eyebrow">שלב 2 מתוך 2</p><h2>הגדרת סביבת העבודה</h2><p className="lead">הפרטים ישמשו ליצירת החשבון הפרטי של העסק.</p></div>
            <label className="field"><span>שם העסק</span><input className="input" placeholder="לדוגמה: קפה נובה" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></label>
            <label className="field"><span>שם הסניף הראשון</span><input className="input" value={branchName} onChange={(e) => setBranchName(e.target.value)} /></label>
            <button className="button primary" disabled={busy} onClick={createWorkspace}>{busy ? <Loader2 className="spin" size={17} /> : null} יצירת סביבת העבודה</button>
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="onboarding-state"><CheckCircle2 size={50} /><h2>סביבת העבודה מוכנה</h2><p>השלב הבא הוא להגדיר סוגי משמרות ולהזמין את הצוות.</p><Link className="button primary" href="/workspace">כניסה לסביבת העסק</Link></div>
        ) : null}

        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    </main>
  );
}

function Loading() {
  return <div className="onboarding-state"><Loader2 className="spin" size={34} /><p>בודקים את החשבון...</p></div>;
}
