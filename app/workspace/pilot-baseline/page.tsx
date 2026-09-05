import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Timer } from "lucide-react";

import { PilotBaselineClient } from "@/app/workspace/pilot-baseline/pilot-baseline-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PilotBaselinePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const { data: organization } = await supabase.from("organizations").select("name").eq("id", membership.organization_id).single();
  if (!organization) redirect("/workspace");

  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, organization_id, organization_name, created_by, category, priority, subject, description, status, resolution_note, assigned_to, created_at, updated_at, first_responded_at, resolved_at, reopened_count")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace/pilot-launch" className="back-link"><ArrowRight size={17} /> חזרה למרכז השקת הפיילוט</Link>
      <p className="eyebrow">{organization.name} · פיילוט ראשון</p>
      <h1><Timer /> מדידת Baseline</h1>
      <p>לפני שאפשר להגיד &quot;ShiftPilot חסך זמן&quot;, צריך מספר להשוות אליו. שתי מדידות קצרות — לפני המחזור הראשון ואחרי שהוא נסגר — נשמרות כפנייה במרכז התמיכה כדי שנוכל לעקוב אחריהן.</p>
    </div></header>

    <PilotBaselineClient
      organizationId={membership.organization_id}
      currentUserId={user.id}
      initialTickets={tickets ?? []}
    />
  </main>;
}
