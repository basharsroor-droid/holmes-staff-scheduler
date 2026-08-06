import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";

import { EmployeesClient } from "@/app/workspace/employees/employees-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
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

  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const [organizationResult, branchesResult, membershipsResult, invitationsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id).eq("active", true).order("name"),
    supabase.from("organization_memberships").select("id, user_id, role, status, seniority_level, can_open, can_close, employee_number").eq("organization_id", membership.organization_id).order("created_at"),
    supabase.from("organization_invitations").select("id, email, first_name, last_name, role, status, token, branch_id, expires_at, created_at").eq("organization_id", membership.organization_id).order("created_at", { ascending: false })
  ]);

  if (!organizationResult.data) redirect("/workspace");

  const userIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, phone, color").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const employees = (membershipsResult.data ?? []).map((item) => ({ ...item, profile: profileMap.get(item.user_id) ?? null }));

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
          <p className="eyebrow">{organizationResult.data.name}</p>
          <h1><Users /> ניהול עובדים</h1>
          <p>מזמינים עובדים ומנהלים במייל ומנהלים תפקידים והרשאות ללא מחיקת היסטוריה.</p>
        </div>
      </header>
      <EmployeesClient
        branches={branchesResult.data ?? []}
        callerRole={membership.role}
        currentUserId={user.id}
        employees={employees}
        invitations={invitationsResult.data ?? []}
        organizationId={membership.organization_id}
        selectedBranchId={membership.branch_id ?? branchesResult.data?.[0]?.id ?? ""}
      />
    </main>
  );
}
