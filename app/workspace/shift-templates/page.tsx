import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3 } from "lucide-react";

import { ShiftTemplatesClient } from "@/app/workspace/shift-templates/shift-templates-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShiftTemplatesPage() {
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

  if (!membership) redirect("/onboarding");
  if (!["owner", "admin", "manager"].includes(membership.role)) {
    redirect("/workspace");
  }

  const [organizationResult, branchesResult, departmentsResult, templatesResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id).eq("active", true).order("name"),
    supabase.from("departments").select("id, branch_id, name").eq("organization_id", membership.organization_id).eq("active", true).order("name"),
    supabase
      .from("shift_templates")
      .select("id, branch_id, department_id, name, shift_type, start_time, end_time, required_employees, requires_senior_employee, active")
      .eq("organization_id", membership.organization_id)
      .order("start_time")
  ]);

  if (!organizationResult.data) redirect("/workspace");

  const branches = branchesResult.data ?? [];
  // The manager's own membership.branch_id is only a starting point -- an
  // owner/admin overseeing several branches (e.g. a gym chain with more
  // than one location) needs to manage shift templates for branches other
  // than the one their own membership happens to be pinned to, so this
  // page no longer hard-filters to it server-side. Previously it also
  // redirected away entirely whenever membership.branch_id was null (an
  // owner with no personal branch assignment), which would have locked
  // that owner out of managing templates for any branch at all.
  const selectedBranchId = (membership.branch_id && branches.some((b) => b.id === membership.branch_id))
    ? membership.branch_id
    : branches[0]?.id ?? "";

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
          <p className="eyebrow">{organizationResult.data.name}</p>
          <h1><Clock3 /> סוגי משמרות</h1>
          <p>מגדירים פעם אחת את שעות המשמרות, מספר העובדים והדרישות. ההגדרות ישמשו בכל חודש עבודה.</p>
        </div>
      </header>

      <ShiftTemplatesClient
        branches={branches}
        departments={departmentsResult.data ?? []}
        initialTemplates={templatesResult.data ?? []}
        organizationId={membership.organization_id}
        selectedBranchId={selectedBranchId}
      />
    </main>
  );
}
