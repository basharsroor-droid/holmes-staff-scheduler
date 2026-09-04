import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck } from "lucide-react";

import { AvailabilityClient } from "@/app/workspace/availability/availability-client";
import { TimeOffClient } from "@/app/workspace/availability/time-off-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
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

  if (!membership?.branch_id) redirect("/workspace");

  const [organizationResult, branchResult, periodsResult, templatesResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("name").eq("id", membership.branch_id).single(),
    supabase.from("schedule_periods").select("id, department_id, year, month, status, submission_opens_at, submission_closes_at").eq("organization_id", membership.organization_id).eq("branch_id", membership.branch_id).eq("status", "collecting").order("year").order("month"),
    supabase.from("shift_templates").select("id, department_id, name, start_time, end_time").eq("organization_id", membership.organization_id).eq("branch_id", membership.branch_id).eq("active", true).order("start_time")
  ]);

  if (!organizationResult.data || !branchResult.data) redirect("/workspace");

  const periodIds = (periodsResult.data ?? []).map((period) => period.id);
  const { data: submissions } = periodIds.length
    ? await supabase.from("availability_submissions").select("id, schedule_period_id, submitted_at, manager_note").eq("user_id", user.id).in("schedule_period_id", periodIds)
    : { data: [] };
  const submissionIds = (submissions ?? []).map((submission) => submission.id);
  const { data: entries } = submissionIds.length
    ? await supabase.from("availability_entries").select("id, submission_id, shift_template_id, shift_date, status, note").in("submission_id", submissionIds)
    : { data: [] };

  const db = supabase as any;
  const { data: leaveRequests } = await db
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, note, status, manager_note")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
      <p className="eyebrow">{organizationResult.data.name} · {branchResult.data.name}</p>
      <h1><CalendarCheck /> זמינות ו-Time Off</h1>
      <p>מסמנים זמינות למשמרות ושולחים בקשות חופשה או מחלה לאישור המנהל.</p>
    </div></header>

    <TimeOffClient
      organizationId={membership.organization_id}
      userId={user.id}
      initialRequests={leaveRequests ?? []}
    />

    <div className="availability-form-only">
      <AvailabilityClient
        entries={entries ?? []}
        leaveRequests={[]}
        organizationId={membership.organization_id}
        periods={periodsResult.data ?? []}
        submissions={submissions ?? []}
        templates={templatesResult.data ?? []}
        userId={user.id}
      />
    </div>

    <style>{`.availability-form-only .availability-leave-card { display: none; }`}</style>
  </main>;
}
