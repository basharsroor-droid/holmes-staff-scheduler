"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, CheckCircle2, Loader2, Network, ShieldCheck, Store, UserRound, Users } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { BrandLogo } from "@/components/brand/brand-logo";
import { isNativeApp } from "@/lib/native-app";
import { PLANS, TRIAL_DAYS, formatMonthlyPrice, getPlan, recommendPlan, type PlanId } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stage = "loading" | "use" | "account" | "verify" | "recommend" | "workspace" | "done";

const USE_OPTIONS = [
  { id: "solo", label: "אני מנהל/ת צוות באופן עצמאי", icon: UserRound },
  { id: "single", label: "יש לי עסק עם צוות אחד", icon: Briefcase },
  { id: "departments", label: "יש לעסק מספר מחלקות", icon: Network },
  { id: "branches", label: "יש לנו מספר סניפים", icon: Store },
  { id: "invited", label: "הוזמנתי לעסק קיים", icon: Users }
] as const;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export default function OnboardingPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  // See app/login/page.tsx for why: inside the wrapped app the logo
  // shouldn't link back to the marketing site at "/".
  const [nativeApp, setNativeApp] = useState(false);
  useEffect(() => setNativeApp(isNativeApp()), []);

  const [stage, setStage] = useState<Stage>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [inviteInput, setInviteInput] = useState("");

  const [employeeCount, setEmployeeCount] = useState("");
  const [branchCount, setBranchCount] = useState("1");
  const [departmentCount, setDepartmentCount] = useState("1");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("business");
  const [recommendedPlanId, setRecommendedPlanId] = useState<PlanId | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("סניף ראשי");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setStage("use");
        return;
      }
      setFirstName(String(data.user.user_metadata?.first_name ?? ""));
      setLastName(String(data.user.user_metadata?.last_name ?? ""));

      const { data: membership } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership) {
        router.replace("/workspace");
        return;
      }
      // Account exists but no organization yet -- pick a plan, then build it.
      setStage("recommend");
    });
  }, [supabase, router]);

  function chooseUse(id: (typeof USE_OPTIONS)[number]["id"]) {
    setMessage("");
    if (id === "invited") return;
    if (id === "solo") setSelectedPlanId("solo");
    setStage("account");
  }

  function openInvite() {
    const token = inviteInput.match(UUID_RE)?.[0];
    if (!token) {
      setMessage("לא זוהה קוד הזמנה תקין. אפשר להדביק את קישור ההזמנה מהמייל.");
      return;
    }
    router.push(`/auth/accept-invite?token=${token}`);
  }

  async function createAccount() {
    setMessage("");
    if (!email || password.length < 8 || !firstName.trim() || !acceptedLegal) {
      setMessage(acceptedLegal ? "יש למלא שם, כתובת מייל וסיסמה באורך 8 תווים לפחות." : "יש לאשר את תנאי השימוש ומדיניות הפרטיות.");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          legal_terms_version: "2026-08-10",
          legal_accepted_at: new Date().toISOString()
        }
      }
    });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }
    setStage(data.session ? "recommend" : "verify");
  }

  function computeRecommendation() {
    setMessage("");
    const employees = Math.max(0, Math.round(Number(employeeCount) || 0));
    const branches = Math.max(1, Math.round(Number(branchCount) || 1));
    const departments = Math.max(1, Math.round(Number(departmentCount) || 1));
    const planId = recommendPlan({ employees, branches, departments });
    setRecommendedPlanId(planId);
    setSelectedPlanId(planId);
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
      owner_last_name: lastName.trim(),
      selected_plan_id: selectedPlanId
    });
    setBusy(false);

    if (error) {
      if (error.message.includes("already_member")) {
        setMessage("כבר קיים עסק המשויך לחשבון הזה.");
        return;
      }
      setMessage(error.message.includes("duplicate") ? "כבר קיימת סביבת עבודה עם הפרטים האלה." : error.message);
      return;
    }
    setStage("done");
  }

  const progressIndex =
    stage === "account" || stage === "verify" ? 0 : stage === "recommend" ? 1 : stage === "workspace" ? 2 : stage === "done" ? 3 : -1;

  return (
    <main className="onboarding-page business-onboarding" dir="rtl">
      <div className="section-glow blue" style={{ width: 420, height: 420, top: -120, insetInlineEnd: -100 }} aria-hidden="true" />
      <div className="section-glow violet" style={{ width: 340, height: 340, bottom: -140, insetInlineStart: -60 }} aria-hidden="true" />

      <section className="onboarding-intro business-onboarding-intro">
        <BrandLogo href={nativeApp ? undefined : "/"} light />
        <h1>סביבת העבודה של העסק שלך, מוכנה תוך כמה דקות.</h1>
        <p className="lead">פותחים חשבון עסקי מאובטח, בוחרים מסלול ומתחילים {TRIAL_DAYS} ימי ניסיון — בלי כרטיס אשראי.</p>
        <p className="auth-secondary">כבר פתחת חשבון? <Link href="/login">כניסה למערכת</Link></p>
        <div className="onboarding-benefits">
          <div><ShieldCheck /><span><strong>מידע פרטי לכל עסק</strong><small>הפרדה מלאה בין לקוחות והרשאות לפי תפקיד</small></span></div>
          <div><Users /><span><strong>צוות במקום אחד</strong><small>מנהלים, עובדים, זמינות ושיבוצים</small></span></div>
          <div><Building2 /><span><strong>מוכן לגדול</strong><small>אפשרות להוסיף סניפים ומחלקות בהמשך</small></span></div>
        </div>
      </section>

      <section className="auth-card onboarding-card business-onboarding-card">
        {progressIndex >= 0 ? (
          <div className="onboarding-progress" aria-label="התקדמות בהקמת החשבון">
            <span className={progressIndex > 0 ? "complete" : "active"}><b>1</b><small>חשבון</small></span>
            <i aria-hidden="true" />
            <span className={progressIndex > 1 ? "complete" : progressIndex === 1 ? "active" : ""}><b>2</b><small>מסלול</small></span>
            <i aria-hidden="true" />
            <span className={progressIndex > 2 ? "complete" : progressIndex === 2 ? "active" : ""}><b>3</b><small>העסק</small></span>
          </div>
        ) : null}

        {stage === "loading" ? <Loading /> : null}

        {stage === "use" ? (
          <div className="grid">
            <div><p className="eyebrow">שלב 1 מתוך 3</p><h2>איך תרצה להשתמש ב-ShiftPilot?</h2></div>
            <div className="onboarding-choices">
              {USE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className="onboarding-choice"
                  onClick={() => chooseUse(option.id)}
                >
                  <option.icon size={19} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{option.label}</span>
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
            <label className="field">
              <span>הוזמנת? הדבק כאן קוד או קישור הזמנה</span>
              <input className="input" value={inviteInput} onChange={(event) => setInviteInput(event.target.value)} placeholder="https://…/auth/accept-invite?token=…" />
            </label>
            <button className="button" onClick={openInvite}>המשך עם הזמנה</button>
            <p className="auth-secondary">אפשר גם לפתוח את קישור ההזמנה ישירות מהמייל ששלחו לך.</p>
          </div>
        ) : null}

        {stage === "account" ? (
          <div className="grid">
            <div><p className="eyebrow">שלב 1 מתוך 3</p><h2>פתיחת חשבון לבעל העסק</h2></div>
            <div className="form-pair">
              <label className="field"><span>שם פרטי</span><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
              <label className="field"><span>שם משפחה</span><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
            </div>
            <label className="field"><span>מייל עסקי</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <PasswordField label="סיסמה" autoComplete="new-password" value={password} onChange={setPassword} />
            <label className="legal-consent"><input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)} /><span>קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank">תנאי השימוש</Link> ול<Link href="/privacy" target="_blank">מדיניות הפרטיות</Link>.</span></label>
            <button className="button primary" disabled={busy} onClick={createAccount}>{busy ? <Loader2 className="spin" size={17} /> : null} יצירת חשבון מאובטח</button>
          </div>
        ) : null}

        {stage === "verify" ? (
          <div className="onboarding-state"><CheckCircle2 size={46} /><h2>שלחנו לך מייל אימות</h2><p>יש לאשר את כתובת המייל. לאחר האישור תחזור לכאן כדי לבחור מסלול ולהקים את העסק.</p><Link className="button" href="/login">כבר אישרתי — כניסה</Link></div>
        ) : null}

        {stage === "recommend" ? (
          <div className="grid">
            <div><p className="eyebrow">שלב 2 מתוך 3</p><h2>נמליץ לך על מסלול</h2><p className="lead">כמה פרטים קצרים. אפשר לשנות את המסלול בהמשך בכל עת.</p></div>
            <div className="form-pair">
              <label className="field"><span>כמה עובדים מעסיקים היום?</span><input className="input" type="number" min={0} inputMode="numeric" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} /></label>
              <label className="field"><span>כמה סניפים?</span><input className="input" type="number" min={1} inputMode="numeric" value={branchCount} onChange={(e) => setBranchCount(e.target.value)} /></label>
            </div>
            <label className="field"><span>כמה מחלקות?</span><input className="input" type="number" min={1} inputMode="numeric" value={departmentCount} onChange={(e) => setDepartmentCount(e.target.value)} /></label>
            <button className="button" onClick={computeRecommendation}>חישוב המלצה</button>

            {recommendedPlanId ? (
              <div className="plan-reco">
                <strong>מסלול מומלץ: {getPlan(recommendedPlanId).name}</strong>
                <span className="plan-reco-price">{formatMonthlyPrice(getPlan(recommendedPlanId))} · מחיר השקה, לפני מע״מ</span>
                <small>מתחילים ב-{TRIAL_DAYS} ימי ניסיון ללא כרטיס אשראי.</small>
              </div>
            ) : null}

            <label className="field">
              <span>המסלול שאיתו נתחיל</span>
              <select className="input" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value as PlanId)}>
                {PLANS.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name} — {formatMonthlyPrice(plan)}</option>
                ))}
              </select>
            </label>
            <button className="button primary" onClick={() => setStage("workspace")}>המשך להקמת העסק</button>
          </div>
        ) : null}

        {stage === "workspace" ? (
          <div className="grid">
            <div><p className="eyebrow">שלב 3 מתוך 3</p><h2>הקמת סביבת העסק</h2><p className="lead">מתחילים במסלול <strong>{getPlan(selectedPlanId).name}</strong> · {TRIAL_DAYS} ימי ניסיון.</p></div>
            <label className="field"><span>שם העסק</span><input className="input" placeholder="לדוגמה: קפה נובה" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></label>
            <label className="field"><span>שם הסניף הראשון</span><input className="input" value={branchName} onChange={(e) => setBranchName(e.target.value)} /></label>
            <button className="button primary" disabled={busy} onClick={createWorkspace}>{busy ? <Loader2 className="spin" size={17} /> : null} יצירת סביבת העבודה</button>
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="onboarding-state"><CheckCircle2 size={50} /><h2>סביבת העבודה מוכנה</h2><p>נותרו {TRIAL_DAYS} ימי ניסיון להתרשם. השלב הבא הוא להגדיר סוגי משמרות ולהזמין את הצוות.</p><Link className="button primary" href="/workspace">כניסה לסביבת העסק</Link></div>
        ) : null}

        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    </main>
  );
}

function Loading() {
  return <div className="onboarding-state"><Loader2 className="spin" size={34} /><p>בודקים את החשבון...</p></div>;
}
