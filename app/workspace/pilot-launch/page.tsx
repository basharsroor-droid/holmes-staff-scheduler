import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck, CheckCircle2, Circle, ClipboardCheck, Clock3, Flag, Gauge, MessageSquareText, Rocket, Timer, Users } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Period = {
  id: string;
  department_id: string;
  branch_id: string | null;
  year: number;
  month: number;
  status: string;
  published_at: string | null;
  submission_closes_at: string | null;
};

function periodLabel(period: Period | null) {
  if (!period) return "אין תקופה פעילה";
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(period.year, period.month - 1, 1));
}

function durationLabel(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} ש׳ ${remainder} דק׳` : `${hours} ש׳`;
}

export default async function PilotLaunchPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, branch_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const [{ data: organization }, { data: managerDepartments }] = await Promise.all([
    supabase.from("organizations").select("name, schedule_cadence, pilot_mode").eq("id", membership.organization_id).single(),
    membership.role === "manager"
      ? supabase.from("department_memberships").select("department_id").eq("membership_id", membership.id)
      : Promise.resolve({ data: [] })
  ]);
  if (!organization) redirect("/workspace");

  const departmentIds = (managerDepartments ?? []).map((row) => row.department_id);
  if (membership.role === "manager" && departmentIds.length === 0) redirect("/workspace");

  let periodQuery = supabase
    .from("schedule_periods")
    .select("id, department_id, branch_id, year, month, status, published_at, submission_closes_at")
    .eq("organization_id", membership.organization_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (membership.branch_id) periodQuery = periodQuery.eq("branch_id", membership.branch_id);
  if (membership.role === "manager") periodQuery = periodQuery.in("department_id", departmentIds);

  const [{ data: periodRows }, { count: templateCount }, { data: activeMemberships }, { count: pilotFeedbackCount }, { count: baselineBeforeCount }, { count: baselineAfterCount }] = await Promise.all([
    periodQuery,
    supabase.from("shift_templates").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("active", true),
    supabase.from("organization_memberships").select("id, role").eq("organization_id", membership.organization_id).eq("status", "active"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).like("subject", "[Pilot Feedback]%"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).like("subject", "[Pilot Baseline - Before]%"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).like("subject", "[Pilot Baseline - After]%")
  ]);

  const periods = (periodRows ?? []) as Period[];
  const activePeriod = periods.find((period) => ["collecting", "draft", "published"].includes(period.status)) ?? periods[0] ?? null;

  let scopedMembershipIds = (activeMemberships ?? []).map((row) => row.id);
  if (membership.role === "manager" && scopedMembershipIds.length) {
    const { data: scopedDepartmentMemberships } = await supabase
      .from("department_memberships")
      .select("membership_id")
      .eq("organization_id", membership.organization_id)
      .in("department_id", departmentIds)
      .in("membership_id", scopedMembershipIds);
    scopedMembershipIds = Array.from(new Set((scopedDepartmentMemberships ?? []).map((row) => row.membership_id)));
  }

  const employeeCount = (activeMemberships ?? []).filter((row) => row.role === "employee" && scopedMembershipIds.includes(row.id)).length;

  const [{ data: submissions }, { data: shifts }] = await Promise.all([
    activePeriod
      ? supabase.from("availability_submissions").select("id, user_id, submitted_at").eq("schedule_period_id", activePeriod.id).not("submitted_at", "is", null)
      : Promise.resolve({ data: [] }),
    activePeriod
      ? supabase.from("shifts").select("id, required_employees, status").eq("schedule_period_id", activePeriod.id).neq("status", "cancelled")
      : Promise.resolve({ data: [] })
  ]);

  const shiftIds = (shifts ?? []).map((shift) => shift.id);
  const { data: assignments } = shiftIds.length
    ? await supabase.from("shift_assignments").select("shift_id").in("shift_id", shiftIds)
    : { data: [] };

  const submittedCount = new Set((submissions ?? []).map((row) => row.user_id)).size;
  const submissionCompletion = employeeCount > 0 ? Math.min(100, Math.round((submittedCount / employeeCount) * 100)) : 0;
  const requiredAssignments = (shifts ?? []).reduce((sum, shift) => sum + Math.max(0, shift.required_employees ?? 0), 0);
  const assignedCount = assignments?.length ?? 0;
  const coverage = requiredAssignments > 0 ? Math.min(100, Math.round((assignedCount / requiredAssignments) * 100)) : 0;
  const published = activePeriod?.status === "published" || Boolean(activePeriod?.published_at);
  const timeToSchedule = activePeriod?.submission_closes_at && activePeriod?.published_at
    ? Math.max(0, Math.round((new Date(activePeriod.published_at).getTime() - new Date(activePeriod.submission_closes_at).getTime()) / 60_000))
    : null;

  const launchSteps = [
    { complete: (baselineBeforeCount ?? 0) > 0, href: "/workspace/pilot-baseline", title: "נמדד Baseline לפני הפיילוט", description: "כמה זמן ותיקונים לוקח היום להכין סידור בלי ShiftPilot — כדי שיהיה למה להשוות." },
    { complete: (templateCount ?? 0) > 0, href: "/workspace/shift-templates", title: "סוגי משמרות הוגדרו", description: "לפחות תבנית משמרת פעילה אחת מוכנה לשימוש." },
    { complete: Boolean(activePeriod), href: "/workspace/work-months", title: "תקופת עבודה נפתחה", description: "קיימת תקופה שבועית או חודשית שאפשר לעבוד עליה." },
    { complete: employeeCount > 0, href: "/workspace/employees", title: "צוות הפיילוט מחובר", description: "לפחות עובד אחד פעיל נמצא בתחום הניהול שלך." },
    { complete: submittedCount > 0, href: "/workspace/submissions", title: "התקבלה הגשת זמינות אמיתית", description: "לפחות עובד אחד שלח זמינות למחזור הנוכחי." },
    { complete: published, href: "/workspace/schedule-builder", title: "הסידור הראשון פורסם", description: "הפרסום נעשה במפורש על ידי מנהל לאחר בדיקה." },
    { complete: published && (baselineAfterCount ?? 0) > 0, href: "/workspace/pilot-baseline", title: "מחזור 1 נסגר — נמדד After", description: "המחזור נחשב גמור רק אחרי שנמדד הזמן בפועל מול ה-Baseline, לא רק כשהסידור פורסם." }
  ];

  const completedSteps = launchSteps.filter((step) => step.complete).length;
  const progress = Math.round((completedSteps / launchSteps.length) * 100);
  const cycleOneDone = published && (baselineAfterCount ?? 0) > 0;

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
      <p className="eyebrow">{organization.name} · השקת פיילוט{(organization as any).pilot_mode ? " · Pilot Mode פעיל" : ""}</p>
      <h1><Rocket /> מרכז השקת הפיילוט</h1>
      <p>תמונת מצב אחת מהגדרת העסק ועד פרסום הסידור הראשון. הנתונים כאן נקראים מהמערכת ואינם מפרסמים או משנים סידור.</p>
      {(organization as any).pilot_mode ? <p>כלי ה-Intelligence מוסתרים כרגע כדי לשמור על מחזור פשוט. הם ייפתחו בהדרגה אחרי שמחזור 1 ייסגר.</p> : null}
    </div></header>

    <section className="template-list-card">
      <div className="template-list-heading"><div>
        <p className="eyebrow">מחזור ראשון</p>
        <h2>{periodLabel(activePeriod)}</h2>
        <p>תדירות: {organization.schedule_cadence === "weekly" ? "שבועית" : "חודשית"}</p>
      </div><span className={`status-chip ${published ? "active" : "warning"}`}>{published ? "פורסם" : "בתהליך"}</span></div>
      <div className="workspace-stats schedule-stats">
        <article><Flag /><span><strong>{progress}%</strong><small>התקדמות להשקה</small></span></article>
        <article><CalendarCheck /><span><strong>{submissionCompletion}%</strong><small>השלמת הגשות</small></span></article>
        <article><Gauge /><span><strong>{coverage}%</strong><small>כיסוי שיבוצים</small></span></article>
        <article><Clock3 /><span><strong>{durationLabel(timeToSchedule)}</strong><small>Time to Schedule</small></span></article>
      </div>
    </section>

    <section className="pilot-readiness" aria-labelledby="pilot-launch-steps">
      <div className="pilot-readiness-head"><div>
        <p className="eyebrow">מסלול השקה</p>
        <h2 id="pilot-launch-steps">{completedSteps} מתוך {launchSteps.length} אבני דרך הושלמו</h2>
        <p>כל שלב נחשב מושלם רק לפי נתון קיים ב-ShiftPilot, לא לפי סימון ידני.</p>
      </div><div className="pilot-progress" aria-label={`${progress}% הושלמו`}><strong>{progress}%</strong><small>{completedSteps} מתוך {launchSteps.length}</small></div></div>
      <div className="pilot-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <div className="pilot-checklist">
        {launchSteps.map((step, index) => <Link className={step.complete ? "complete" : ""} href={step.href} key={step.title}>
          {step.complete ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
          <span><small>שלב {index + 1}</small><strong>{step.title}</strong><em>{step.description}</em></span>
          <b>{step.complete ? "הושלם" : "המשך"}</b>
        </Link>)}
      </div>
    </section>

    <section className="workspace-next workspace-next-primary"><div><p className="eyebrow">פעולות מנהל</p><h2>הצעד הבא במחזור הראשון</h2></div><div className="workspace-actions">
      <Link href="/workspace/submissions"><ClipboardCheck /><span><strong>מעקב הגשות</strong><small>{submittedCount} עובדים הגישו מתוך {employeeCount} עובדים פעילים בתחום הניהול.</small></span><span className="status-chip active">פתיחה</span></Link>
      <Link href="/workspace/schedule-builder"><Gauge /><span><strong>בדיקה ובניית סידור</strong><small>כיסוי נוכחי {coverage}%. פרסום נשאר פעולה מפורשת של המנהל.</small></span><span className="status-chip active">פתיחה</span></Link>
      <Link href="/workspace/command-center"><Users /><span><strong>מרכז שליטה למנהל</strong><small>חוסרים, בקשות והחלטות שמחכות לטיפול.</small></span><span className="status-chip active">פתיחה</span></Link>
      <Link href="/workspace/pilot-baseline"><Timer /><span><strong>מדידת Baseline (לפני / אחרי)</strong><small>{baselineBeforeCount ?? 0} מדידת &quot;לפני&quot; · {baselineAfterCount ?? 0} מדידת &quot;אחרי&quot;. זה מה שהופך את החיסכון בזמן למספר אמיתי.</small></span><span className="status-chip active">פתיחה</span></Link>
      <Link href="/workspace/pilot-feedback"><MessageSquareText /><span><strong>משוב מהמחזור הראשון</strong><small>{pilotFeedbackCount ?? 0} משובי פיילוט נשמרו עד עכשיו. המשוב נכנס למרכז התמיכה למעקב.</small></span><span className="status-chip active">פתיחה</span></Link>
    </div></section>

    {cycleOneDone ? <section className="submission-banner open"><div><CheckCircle2 /><strong>מחזור 1 נסגר</strong><span>הסידור פורסם ונמדד After מול ה-Baseline. עכשיו אפשר להחליט אילו כלי Intelligence לפתוח בהדרגה במחזור הבא.</span></div></section>
      : published ? <section className="submission-banner open"><div><CheckCircle2 /><strong>הסידור הראשון פורסם</strong><span>נשאר רק למדוד After מול ה-Baseline לפני שסוגרים את מחזור 1 ומחליטים מה לפתוח הלאה.</span></div></section>
      : null}
  </main>;
}
