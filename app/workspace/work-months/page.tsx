import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";

import { WorkMonthsClient } from "@/app/workspace/work-months/work-months-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkMonthsPage() {
  const supabase = await createSupabaseServerClient();
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

  const [organizationResult, branchesResult, departmentsResult, templatesResult, periodsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id).eq("active", true).order("name"),
    supabase.from("departments").select("id, branch_id, name").eq("organization_id", membership.organization_id).eq("active", true).order("name"),
    supabase.from("shift_templates").select("id, branch_id, department_id, name, start_time, end_time").eq("organization_id", membership.organization_id).eq("active", true).order("start_time"),
    supabase.from("schedule_periods").select("id, branch_id, department_id, year, month, status, submission_opens_at, submission_closes_at, published_at").eq("organization_id", membership.organization_id).order("year", { ascending: false }).order("month", { ascending: false })
  ]);

  if (!organizationResult.data) redirect("/workspace");

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
      <p className="eyebrow">{organizationResult.data.name}</p>
      <h1><CalendarDays /> חודשי עבודה</h1>
      <p>פותחים חודש להגשת זמינות, קובעים דדליין וממשיכים להכנת הסידור.</p>
    </div></header>
    <WorkMonthsClient
      branches={branchesResult.data ?? []}
      departments={departmentsResult.data ?? []}
      currentUserId={user.id}
      initialPeriods={periodsResult.data ?? []}
      organizationId={membership.organization_id}
      selectedBranchId={membership.branch_id ?? branchesResult.data?.[0]?.id ?? ""}
      templates={templatesResult.data ?? []}
    />
  </main>;
}
