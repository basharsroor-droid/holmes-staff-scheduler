import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";

import { WorkMonthsClient } from "@/app/workspace/work-months/work-months-client";
import { SetupStepGuide } from "@/components/workspace/setup-step-guide";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkMonthsPage({
  searchParams
}: {
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
    branch?: string | string[];
    department?: string | string[];
    return?: string | string[];
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, branch_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const [organizationResult, branchesResult, departmentsResult, templatesResult, periodsResult, requested] =
    await Promise.all([
      supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
      supabase
        .from("branches")
        .select("id, name")
        .eq("organization_id", membership.organization_id)
        .eq("active", true)
        .order("name"),
      supabase
        .from("departments")
        .select("id, branch_id, name")
        .eq("organization_id", membership.organization_id)
        .eq("active", true)
        .order("name"),
      supabase
        .from("shift_templates")
        .select("id, branch_id, department_id, name, start_time, end_time")
        .eq("organization_id", membership.organization_id)
        .eq("active", true)
        .order("start_time"),
      supabase
        .from("schedule_periods")
        .select(
          "id, branch_id, department_id, year, month, status, submission_opens_at, submission_closes_at, published_at"
        )
        .eq("organization_id", membership.organization_id)
        .order("year", { ascending: false })
        .order("month", { ascending: false }),
      searchParams
    ]);

  if (!organizationResult.data) redirect("/workspace");

  const branches = branchesResult.data ?? [];
  const departments = departmentsResult.data ?? [];
  const requestedBranch = typeof requested.branch === "string" ? requested.branch : "";
  const requestedDepartment = typeof requested.department === "string" ? requested.department : "";
  const validBranch = branches.some((branch) => branch.id === requestedBranch) ? requestedBranch : "";
  const validDepartment = departments.some(
    (department) => department.id === requestedDepartment && (!validBranch || department.branch_id === validBranch)
  )
    ? requestedDepartment
    : "";
  const requestedYear = typeof requested.year === "string" ? Number(requested.year) : NaN;
  const requestedMonth = typeof requested.month === "string" ? Number(requested.month) : NaN;
  const initialYear =
    Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100 ? requestedYear : null;
  const initialMonth =
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : null;
  const returnToScheduleBuilder = requested.return === "schedule-builder";
  const selectedBranchId = validBranch || membership.branch_id || branches[0]?.id || "";

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link">
            <ArrowRight size={17} /> חזרה לסביבת העסק
          </Link>
          <p className="eyebrow">{organizationResult.data.name}</p>
          <h1>
            <CalendarDays /> חודשי עבודה
          </h1>
          <p>פותחים חודש להגשת זמינות, קובעים מועד אחרון וממשיכים להכנת הסידור</p>
        </div>
      </header>
      <SetupStepGuide step="work-month" complete={(periodsResult.data ?? []).length > 0} />
      <WorkMonthsClient
        branches={branches}
        departments={departments}
        currentUserId={user.id}
        initialDepartmentId={validDepartment}
        initialMonth={initialMonth}
        initialPeriods={periodsResult.data ?? []}
        initialYear={initialYear}
        organizationId={membership.organization_id}
        returnToScheduleBuilder={returnToScheduleBuilder}
        selectedBranchId={selectedBranchId}
        templates={templatesResult.data ?? []}
      />
    </main>
  );
}
