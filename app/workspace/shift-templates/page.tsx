import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3 } from "lucide-react";

import { ShiftTemplatesClient } from "@/app/workspace/shift-templates/shift-templates-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShiftTemplatesPage() {
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

  if (!membership) redirect("/onboarding");
  if (!membership.branch_id || !["owner", "admin", "manager"].includes(membership.role)) {
    redirect("/workspace");
  }

  const [organizationResult, branchResult, templatesResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("name").eq("id", membership.branch_id).single(),
    supabase
      .from("shift_templates")
      .select("id, name, shift_type, start_time, end_time, required_employees, requires_senior_employee, active")
      .eq("organization_id", membership.organization_id)
      .eq("branch_id", membership.branch_id)
      .order("start_time")
  ]);

  if (!organizationResult.data || !branchResult.data) redirect("/workspace");

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
          <p className="eyebrow">{organizationResult.data.name} · {branchResult.data.name}</p>
          <h1><Clock3 /> סוגי משמרות</h1>
          <p>מגדירים פעם אחת את שעות המשמרות, מספר העובדים והדרישות. ההגדרות ישמשו בכל חודש עבודה.</p>
        </div>
      </header>

      <ShiftTemplatesClient
        branchId={membership.branch_id}
        initialTemplates={templatesResult.data ?? []}
        organizationId={membership.organization_id}
      />
    </main>
  );
}
