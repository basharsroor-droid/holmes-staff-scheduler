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

  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) {
    redirect("/workspace");
  }

  const [organizationResult, branchResult, membershipsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    membership.branch_id
      ? supabase.from("branches").select("name").eq("id", membership.branch_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("organization_memberships")
      .select("id, user_id, role, status, seniority_level, can_open, can_close, employee_number")
      .eq("organization_id", membership.organization_id)
      .order("created_at")
  ]);

  if (!organizationResult.data) redirect("/workspace");

  const userIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, phone, color").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const employees = (membershipsResult.data ?? []).map((item) => ({
    ...item,
    profile: profileMap.get(item.user_id) ?? null
  }));

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
          <p className="eyebrow">{organizationResult.data.name} · {branchResult.data?.name ?? "כל הסניפים"}</p>
          <h1><Users /> ניהול עובדים</h1>
          <p>ניהול תפקידים, הרשאות פתיחה וסגירה ומצב העובדים — ללא מחיקת היסטוריית העבודה.</p>
        </div>
      </header>
      <EmployeesClient currentUserId={user.id} employees={employees} organizationId={membership.organization_id} />
    </main>
  );
}
