import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Network } from "lucide-react";

import { DepartmentsClient } from "@/app/workspace/departments/departments-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id, branch_id, role, access_scope")
    .eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || membership.role === "employee") redirect("/workspace");

  const [organizationResult, branchesResult, departmentsResult, membershipsResult, assignmentsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id).eq("active", true).order("name"),
    supabase.from("departments").select("id, branch_id, name, active").eq("organization_id", membership.organization_id).order("name"),
    supabase.from("organization_memberships").select("id, user_id, branch_id, role, status, access_scope").eq("organization_id", membership.organization_id).eq("status", "active").order("created_at"),
    supabase.from("department_memberships").select("department_id, membership_id, is_primary").eq("organization_id", membership.organization_id)
  ]);
  if (!organizationResult.data) redirect("/workspace");

  const visibleMemberships = (membershipsResult.data ?? []).filter((item) =>
    ["owner", "admin"].includes(membership.role) || Boolean(membership.branch_id && item.branch_id === membership.branch_id));
  const profileIds = visibleMemberships.map((item) => item.user_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", profileIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
      <p className="eyebrow">{organizationResult.data.name}</p>
      <h1><Network /> סניפים ומחלקות</h1>
      <p>יוצרים מחלקות בכל סניף ומגדירים בדיוק לאילו אזורים כל מנהל ועובד שייכים.</p>
    </div></header>
    <DepartmentsClient
      organizationId={membership.organization_id} callerRole={membership.role} callerBranchId={membership.branch_id}
      branches={branchesResult.data ?? []} initialDepartments={departmentsResult.data ?? []}
      assignments={assignmentsResult.data ?? []}
      members={visibleMemberships.map((item) => ({ ...item, profile: profileMap.get(item.user_id) ?? null }))}
    />
  </main>;
}
