import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Repeat2 } from "lucide-react";

import { ShiftSwapsClient } from "@/app/workspace/shift-swaps/shift-swaps-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShiftSwapsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, branch_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/workspace");
  const organizationId = membership.organization_id;
  const isManager = ["owner", "admin", "manager"].includes(membership.role);

  const [{ data: organization }, { data: memberships }, { data: shifts }, { data: assignments }, { data: requests }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", organizationId).single(),
    supabase.from("organization_memberships").select("id, user_id, branch_id, role").eq("organization_id", organizationId).eq("status", "active").in("role", ["employee", "manager"]),
    supabase.from("shifts").select("id, shift_date, name, start_time, end_time, status").eq("organization_id", organizationId).eq("status", "published").gte("shift_date", new Date().toISOString().slice(0, 10)).order("shift_date").order("start_time"),
    supabase.from("shift_assignments").select("id, shift_id, user_id").eq("organization_id", organizationId),
    supabase.from("swap_requests").select("id, original_assignment_id, requested_by, target_user_id, target_shift_id, reason, status, manager_note, created_at, decided_at").eq("organization_id", organizationId).order("created_at", { ascending: false })
  ]);
  if (!organization) redirect("/workspace");

  const userIds = (memberships ?? []).map((item) => item.user_id);
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("id, first_name, last_name, color").in("id", userIds) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const workers = (memberships ?? []).map((item) => ({ ...item, profile: profileMap.get(item.user_id) ?? null }));

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
      <p className="eyebrow">{organization.name}</p>
      <h1><Repeat2 /> החלפת משמרות</h1>
      <p>{isManager ? "בדיקת בקשות ואישור סופי לפני שינוי הסידור." : "פתיחת בקשה, אישור העובד השני ומעקב אחר החלטת המנהל."}</p>
    </div></header>
    <ShiftSwapsClient
      assignments={assignments ?? []}
      currentUserId={user.id}
      isManager={isManager}
      organizationId={organizationId}
      requests={requests ?? []}
      shifts={shifts ?? []}
      workers={workers}
    />
  </main>;
}
