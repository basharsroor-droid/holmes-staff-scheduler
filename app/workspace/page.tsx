import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Bell, Building2, CalendarCheck, CalendarDays, CalendarRange, CheckCircle2, Circle, ClipboardCheck, Clock3, History, LifeBuoy, Network, Repeat2, Rocket, Search, Settings, ShieldCheck, Users } from "lucide-react";

import { LogoutButton } from "@/app/workspace/logout-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { TrialBanner } from "@/components/workspace/trial-banner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, branch_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  const [organizationResult, branchResult, membersResult, templatesResult, periodsResult, openPeriodsResult, notificationsResult] = await Promise.all([
    supabase.from("organizations").select("name, timezone").eq("id", membership.organization_id).single(),
    membership.branch_id ? supabase.from("branches").select("name").eq("id", membership.branch_id).single() : Promise.resolve({ data: null }),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "active"),
    supabase.from("shift_templates").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("active", true),
    membership.branch_id ? supabase.from("schedule_periods").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("branch_id", membership.branch_id) : Promise.resolve({ count: 0 }),
    membership.branch_id ? supabase.from("schedule_periods").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("branch_id", membership.branch_id).eq("status", "collecting") : Promise.resolve({ count: 0 }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("user_id", user.id).eq("channel", "in_app").is("read_at", null)
  ]);

  const organization = organizationResult.data;
  if (!organization) redirect("/onboarding");
  const isEmployee = membership.role === "employee";

  const pilotSteps = [
    {
      complete: (templatesResult.count ?? 0) > 0,
      href: "/workspace/shift-templates",
      title: "הגדרת סוגי משמרות",
      description: "הוסיפו פתיחה, אמצע וסגירה עם השעות והתקן האמיתיים."
    },
    {
      complete: (periodsResult.count ?? 0) > 0,
      href: "/workspace/work-months",
      title: "פתיחת חודש עבודה",
      description: "בחרו חודש וקבעו מתי העובדים יכולים להגיש זמינות."
    },
    {
      complete: (membersResult.count ?? 0) > 1,
      href: "/workspace/employees",
      title: "הזמנת צוות הפיילוט",
      description: "הזמינו מנהל/ת ולפחות שני עובדי בדיקה במייל."
    }
  ];
  const completedPilotSteps = pilotSteps.filter((step) => step.complete).length;
  const pilotProgress = Math.round((completedPilotSteps / pilotSteps.length) * 100);

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-home-header"><BrandLogo href="/" /><LogoutButton /></header>
    <section className="workspace-welcome"><div><TrialBanner organizationId={membership.organization_id} /><p className="eyebrow">סביבת עבודה מאובטחת</p><h1>שלום, {organization.name}</h1><p>{isEmployee ? "מכאן מגישים זמינות, רואים משמרות ומנהלים החלפות." : "מכאן מנהלים את הצוות, הזמינות והסידור."}</p></div><div className="role-pill">{isEmployee ? "עובד/ת" : membership.role === "owner" ? "בעל/ת העסק" : "מנהל/ת"}</div></section>
    {isEmployee ? <>
      <section className="workspace-stats"><article><Building2 /><span><strong>{branchResult.data?.name ?? "הסניף"}</strong><small>סביבת העבודה שלך</small></span></article><article><CalendarCheck /><span><strong>{openPeriodsResult.count ?? 0}</strong><small>חודשים פתוחים להגשה</small></span></article><article><Clock3 /><span><strong>{templatesResult.count ?? 0}</strong><small>סוגי משמרות פעילים</small></span></article></section>
      <section className="workspace-next"><div><p className="eyebrow">פעולות עובד</p><h2>המשימות שלך</h2></div><div className="workspace-actions"><Link href="/workspace/availability"><CalendarCheck /><span><strong>הגשת זמינות</strong><small>סימון משמרות ושליחה למנהל.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/my-shifts"><CalendarDays /><span><strong>המשמרות שלי</strong><small>צפייה בסידור שפורסם ובמשמרת הקרובה.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/shift-swaps"><Repeat2 /><span><strong>החלפת משמרת</strong><small>פתיחת בקשה ומעקב אחר האישורים.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/notifications"><Bell /><span><strong>התראות</strong><small>סידורים חדשים ועדכונים חשובים.</small></span><span className={`status-chip ${notificationsResult.count ? "warning" : "active"}`}>{notificationsResult.count ?? 0} חדשות</span></Link><Link href="/workspace/support"><LifeBuoy /><span><strong>מרכז תמיכה</strong><small>פתיחת פנייה ומעקב אחר הטיפול.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/help"><Search /><span><strong>מרכז עזרה</strong><small>שאלות ותקלות נפוצות עם פתרון.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/security"><ShieldCheck /><span><strong>אבטחת חשבון</strong><small>הפעלת אימות דו-שלבי (MFA).</small></span><span className="status-chip active">פתיחה</span></Link></div></section>
    </> : <>
      <section className="workspace-stats"><article><Building2 /><span><strong>{branchResult.data?.name ?? "הסניף הראשי"}</strong><small>סניף פעיל</small></span></article><article><Users /><span><strong>{membersResult.count ?? 0}</strong><small>חברי צוות פעילים</small></span></article><article><Clock3 /><span><strong>{templatesResult.count ?? 0}</strong><small>סוגי משמרות</small></span></article></section>

      {completedPilotSteps < pilotSteps.length ? <section className="pilot-readiness" aria-labelledby="pilot-readiness-title">
        <div className="pilot-readiness-head">
          <div><p className="eyebrow">הכנת הפיילוט</p><h2 id="pilot-readiness-title">שלושה צעדים עד להגשת זמינות ראשונה</h2><p>השלימו את ההגדרות לפי הסדר. הנתונים נשמרים רק בעסק ובסניף שלכם.</p></div>
          <div className="pilot-progress" aria-label={`${pilotProgress}% הושלמו`}><strong>{pilotProgress}%</strong><small>{completedPilotSteps} מתוך {pilotSteps.length}</small></div>
        </div>
        <div className="pilot-progress-track" aria-hidden="true"><span style={{ width: `${pilotProgress}%` }} /></div>
        <div className="pilot-checklist">
          {pilotSteps.map((step, index) => <Link className={step.complete ? "complete" : ""} href={step.href} key={step.href}>
            {step.complete ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
            <span><small>שלב {index + 1}</small><strong>{step.title}</strong><em>{step.description}</em></span>
            <b>{step.complete ? "הושלם" : "המשך"}</b>
          </Link>)}
        </div>
      </section> : <section className="pilot-readiness pilot-ready">
        <div><CheckCircle2 aria-hidden="true" /><span><p className="eyebrow">מוכנים לבדיקה</p><h2>הגדרות הפיילוט הושלמו</h2><p>אפשר להתחיל בהגשת זמינות, לבדוק את ההגשות ולבנות סידור ראשון.</p></span></div>
        <Link className="button primary" href="/workspace/submissions">מעקב הגשות</Link>
      </section>}

      <section className="workspace-next workspace-next-compact"><div><p className="eyebrow">מרכז שליטה</p><h2>תמונת מצב ניהולית</h2></div><div className="workspace-actions"><Link href="/workspace/command-center"><Activity /><span><strong>מרכז שליטה למנהל</strong><small>בריאות הסידור, חוסרים, בקשות ממתינות והמלצות פעולה במקום אחד.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/pilot-launch"><Rocket /><span><strong>מרכז השקת הפיילוט</strong><small>התקדמות מהגדרת העסק ועד פרסום הסידור הראשון, כולל הגשות וכיסוי.</small></span><span className="status-chip active">פתיחה</span></Link></div></section>

      <section className="workspace-next workspace-next-compact"><div><p className="eyebrow">מבנה ארגוני</p><h2>סניפים ומחלקות</h2></div><div className="workspace-actions"><Link href="/workspace/departments"><Network /><span><strong>ניהול סניפים ומחלקות</strong><small>שיוך מנהלים ועובדים לאזור העבודה המדויק שלהם.</small></span><span className="status-chip active">פתיחה</span></Link></div></section>

      <section className="workspace-next workspace-next-primary"><div><p className="eyebrow">הגדרת העסק</p><h2>כלי הניהול</h2></div><div className="workspace-actions"><Link href="/workspace/employees"><Users /><span><strong>ניהול עובדים</strong><small>הזמנות, תפקידים והרשאות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/shift-templates"><Settings /><span><strong>סוגי משמרות</strong><small>שעות, כמות עובדים ודרישות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/work-months"><CalendarDays /><span><strong>חודשי עבודה</strong><small>פתיחת הגשת זמינות וקביעת דדליין.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/submissions"><ClipboardCheck /><span><strong>מעקב הגשות</strong><small>מי הגיש, מי חסר ופירוט הזמינות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/schedule-builder"><CalendarRange /><span><strong>בניית סידור</strong><small>יצירת משמרות, שיבוץ ופרסום לצוות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/shift-swaps"><Repeat2 /><span><strong>בקשות החלפה</strong><small>אישור החלפות ועדכון הסידור.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/notifications"><Bell /><span><strong>התראות</strong><small>סידורים חדשים ועדכונים חשובים.</small></span><span className={`status-chip ${notificationsResult.count ? "warning" : "active"}`}>{notificationsResult.count ?? 0} חדשות</span></Link><Link href="/workspace/support"><LifeBuoy /><span><strong>מרכז תמיכה</strong><small>פתיחת פניות ומעקב אחר טיפול בבעיות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/help"><Search /><span><strong>מרכז עזרה</strong><small>שאלות ותקלות נפוצות עם פתרון.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/security"><ShieldCheck /><span><strong>אבטחת חשבון</strong><small>הפעלת אימות דו-שלבי (MFA).</small></span><span className="status-chip active">פתיחה</span></Link>{["owner", "admin"].includes(membership.role) ? <Link href="/workspace/audit-log"><History /><span><strong>יומן פעילות</strong><small>מעקב מאובטח אחר פעולות ניהול.</small></span><span className="status-chip active">פתיחה</span></Link> : null}</div></section>
    </>}
  </main>;
}