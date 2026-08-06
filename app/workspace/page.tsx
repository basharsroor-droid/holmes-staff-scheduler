import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarCheck, CalendarDays, CalendarRange, ClipboardCheck, Clock3, Repeat2, Settings, Users } from "lucide-react";

import { LogoutButton } from "@/app/workspace/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, branch_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  const [organizationResult, branchResult, membersResult, templatesResult, openPeriodsResult] = await Promise.all([
    supabase.from("organizations").select("name, timezone").eq("id", membership.organization_id).single(),
    membership.branch_id ? supabase.from("branches").select("name").eq("id", membership.branch_id).single() : Promise.resolve({ data: null }),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "active"),
    supabase.from("shift_templates").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("active", true),
    membership.branch_id ? supabase.from("schedule_periods").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("branch_id", membership.branch_id).eq("status", "collecting") : Promise.resolve({ count: 0 })
  ]);

  const organization = organizationResult.data;
  if (!organization) redirect("/onboarding");
  const isEmployee = membership.role === "employee";

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-home-header"><Link href="/" className="brand"><div className="brand-mark">SP</div><div><div className="brand-title">ShiftPilot</div><div className="brand-subtitle">סביבת העסק</div></div></Link><LogoutButton /></header>
    <section className="workspace-welcome"><div><p className="eyebrow">סביבת עבודה מאובטחת</p><h1>שלום, {organization.name}</h1><p>{isEmployee ? "מכאן מגישים זמינות, רואים משמרות ומנהלים החלפות." : "מכאן מנהלים את הצוות, הזמינות והסידור."}</p></div><div className="role-pill">{isEmployee ? "עובד/ת" : membership.role === "owner" ? "בעל/ת העסק" : "מנהל/ת"}</div></section>
    {isEmployee ? <>
      <section className="workspace-stats"><article><Building2 /><span><strong>{branchResult.data?.name ?? "הסניף"}</strong><small>סביבת העבודה שלך</small></span></article><article><CalendarCheck /><span><strong>{openPeriodsResult.count ?? 0}</strong><small>חודשים פתוחים להגשה</small></span></article><article><Clock3 /><span><strong>{templatesResult.count ?? 0}</strong><small>סוגי משמרות פעילים</small></span></article></section>
      <section className="workspace-next"><div><p className="eyebrow">פעולות עובד</p><h2>המשימות שלך</h2></div><div className="workspace-actions"><Link href="/workspace/availability"><CalendarCheck /><span><strong>הגשת זמינות</strong><small>סימון משמרות ושליחה למנהל.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/my-shifts"><CalendarDays /><span><strong>המשמרות שלי</strong><small>צפייה בסידור שפורסם ובמשמרת הקרובה.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/shift-swaps"><Repeat2 /><span><strong>החלפת משמרת</strong><small>פתיחת בקשה ומעקב אחר האישורים.</small></span><span className="status-chip active">פתיחה</span></Link></div></section>
    </> : <>
      <section className="workspace-stats"><article><Building2 /><span><strong>{branchResult.data?.name ?? "הסניף הראשי"}</strong><small>סניף פעיל</small></span></article><article><Users /><span><strong>{membersResult.count ?? 0}</strong><small>חברי צוות פעילים</small></span></article><article><Clock3 /><span><strong>{templatesResult.count ?? 0}</strong><small>סוגי משמרות</small></span></article></section>
      <section className="workspace-next"><div><p className="eyebrow">הגדרת העסק</p><h2>כלי הניהול</h2></div><div className="workspace-actions"><Link href="/workspace/employees"><Users /><span><strong>ניהול עובדים</strong><small>הזמנות, תפקידים והרשאות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/shift-templates"><Settings /><span><strong>סוגי משמרות</strong><small>שעות, כמות עובדים ודרישות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/work-months"><CalendarDays /><span><strong>חודשי עבודה</strong><small>פתיחת הגשת זמינות וקביעת דדליין.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/submissions"><ClipboardCheck /><span><strong>מעקב הגשות</strong><small>מי הגיש, מי חסר ופירוט הזמינות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/schedule-builder"><CalendarRange /><span><strong>בניית סידור</strong><small>יצירת משמרות, שיבוץ ופרסום לצוות.</small></span><span className="status-chip active">פתיחה</span></Link><Link href="/workspace/shift-swaps"><Repeat2 /><span><strong>בקשות החלפה</strong><small>אישור החלפות ועדכון הסידור.</small></span><span className="status-chip active">פתיחה</span></Link></div></section>
    </>}
  </main>;
}
