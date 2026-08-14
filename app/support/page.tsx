import { redirect } from "next/navigation";
import { Headphones, ShieldCheck } from "lucide-react";

import { LogoutButton } from "@/app/workspace/logout-button";
import { SupportClient } from "@/app/workspace/support/support-client";
import { BrandLogo } from "@/components/brand/brand-logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformSupportPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supportAgent } = await supabase.from("platform_support_agents")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (!supportAgent) redirect("/workspace");

  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, organization_id, organization_name, created_by, category, priority, subject, description, status, resolution_note, created_at, updated_at")
    .order("created_at", { ascending: false }).limit(250);

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-home-header"><BrandLogo href="/support" /><LogoutButton /></header>
    <section className="workspace-welcome support-console-hero"><div><p className="eyebrow">SHIFT PILOT OPERATIONS</p><h1><Headphones /> מסוף התמיכה</h1><p>טיפול מרוכז בפניות של כלל העסקים, ללא גישה לסידורים, לעובדים או לנתונים שאינם נחוצים לפנייה.</p></div><div className="role-pill"><ShieldCheck size={16} /> צוות התמיכה</div></section>
    <section className="workspace-subheader"><div><p className="eyebrow">תור פניות מרכזי</p><h2>{tickets?.length ?? 0} פניות במערכת</h2></div></section>
    <SupportClient organizationId="" currentUserId={user.id} canManage initialTickets={tickets ?? []} showCreateForm={false} />
  </main>;
}
