import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, Clock3, Settings, Users } from "lucide-react";

import { LogoutButton } from "@/app/workspace/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, branch_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const [organizationResult, branchResult, membersResult, templatesResult] = await Promise.all([
    supabase.from("organizations").select("name, timezone").eq("id", membership.organization_id).single(),
    membership.branch_id ? supabase.from("branches").select("name").eq("id", membership.branch_id).single() : Promise.resolve({ data: null }),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "active"),
    supabase.from("shift_templates").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("active", true)
  ]);

  const organization = organizationResult.data;
  if (!organization) redirect("/onboarding");

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-home-header">
        <Link href="/" className="brand"><div className="brand-mark">SP</div><div><div className="brand-title">ShiftPilot</div><div className="brand-subtitle">סביבת העסק</div></div></Link>
        <LogoutButton />
      </header>

      <section className="workspace-welcome">
        <div><p className="eyebrow">סביבת עבודה מאובטחת</p><h1>שלום, {organization.name}</h1><p>החשבון מחובר בהצלחה. מכאן נגדיר את הצוות, סוגי המשמרות והסידור הראשון.</p></div>
        <div className="role-pill">{membership.role === "owner" ? "בעל/ת העסק" : "מנהל/ת"}</div>
      </section>

      <section className="workspace-stats">
        <article><Building2 /><span><strong>{branchResult.data?.name ?? "הסניף הראשי"}</strong><small>סניף פעיל</small></span></article>
        <article><Users /><span><strong>{membersResult.count ?? 0}</strong><small>חברי צוות פעילים</small></span></article>
        <article><Clock3 /><span><strong>{templatesResult.count ?? 0}</strong><small>סוגי משמרות</small></span></article>
      </section>

      <section className="workspace-next">
        <div><p className="eyebrow">השלבים הבאים</p><h2>השלמת הגדרת העסק</h2></div>
        <div className="workspace-actions">
          <div><Users /><span><strong>הזמנת עובדים</strong><small>נוסיף הזמנות מאובטחות במייל בשלב הבא.</small></span><span className="status-chip">בקרוב</span></div>
          <Link href="/workspace/shift-templates"><Settings /><span><strong>הגדרת סוגי משמרות</strong><small>פתיחה, אמצע, סגירה או כל מבנה שהעסק צריך.</small></span><span className="status-chip active">פתיחה</span></Link>
          <div><CalendarDays /><span><strong>יצירת חודש עבודה ראשון</strong><small>פתיחת חלון זמינות ובניית הסידור.</small></span><span className="status-chip">בקרוב</span></div>
        </div>
      </section>
    </main>
  );
}
