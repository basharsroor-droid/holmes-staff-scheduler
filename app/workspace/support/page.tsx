import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LifeBuoy } from "lucide-react";

import { SupportClient } from "@/app/workspace/support/support-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/workspace");

  const [{ data: organization }, { data: supportAgent }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("platform_support_agents").select("user_id").eq("user_id", user.id).maybeSingle()
  ]);
  if (!organization) redirect("/workspace");
  const ticketsQuery = supabase.from("support_tickets")
    .select("id, organization_id, organization_name, created_by, category, priority, subject, description, status, resolution_note, created_at, updated_at")
    .order("created_at", { ascending: false }).limit(100);
  const { data: tickets } = supportAgent ? await ticketsQuery : await ticketsQuery.eq("created_by", user.id);

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
      <p className="eyebrow">{organization.name} · עזרה ושירות</p>
      <h1><LifeBuoy /> מרכז תמיכה</h1>
      <p>פותחים פנייה מסודרת, מציינים את רמת הדחיפות ועוקבים אחר הטיפול במקום אחד.</p>
    </div></header>
    <SupportClient organizationId={membership.organization_id} currentUserId={user.id}
      canManage={Boolean(supportAgent)} initialTickets={tickets ?? []} />
  </main>;
}
