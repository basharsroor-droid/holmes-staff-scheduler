import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarRange } from "lucide-react";

import { ScheduleBuilderClient } from "@/app/workspace/schedule-builder/schedule-builder-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ScheduleBuilderPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const organizationId = membership.organization_id;
  const [organizationResult, branchesResult, periodsResult, templatesResult, membershipsResult, leaveRequestsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", organizationId).single(),
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("schedule_periods").select("id, branch_id, year, month, status, published_at").eq("organization_id", organizationId).order("year", { ascending: false }).order("month", { ascending: false }),
    supabase.from("shift_templates").select("id, branch_id, name, start_time, end_time, required_employees, requires_senior_employee").eq("organization_id", organizationId).eq("active", true).order("start_time"),
    supabase.from("organization_memberships").select("id, user_id, branch_id, role, seniority_level, can_open, can_close").eq("organization_id", organizationId).eq("status", "active").in("role", ["employee", "manager"]),
    supabase.from("leave_requests").select("id, user_id, leave_type, start_date, end_date").eq("organization_id", organizationId)
  ]);
  if (!organizationResult.data) redirect("/workspace");

  const userIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const periodIds = (periodsResult.data ?? []).map((item) => item.id);
  const [{ data: profiles }, { data: shifts }, { data: submissions }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, first_name, last_name, color").in("id", userIds) : Promise.resolve({ data: [] }),
    periodIds.length ? supabase.from("shifts").select("id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status").in("schedule_period_id", periodIds).order("shift_date").order("start_time") : Promise.resolve({ data: [] }),
    periodIds.length ? supabase.from("availability_submissions").select("id, schedule_period_id, user_id, submitted_at").in("schedule_period_id", periodIds) : Promise.resolve({ data: [] })
  ]);
  const shiftIds = (shifts ?? []).map((item) => item.id);
  const submissionIds = (submissions ?? []).map((item) => item.id);
  const [{ data: assignments }, { data: availability }] = await Promise.all([
    shiftIds.length ? supabase.from("shift_assignments").select("id, shift_id, user_id").in("shift_id", shiftIds) : Promise.resolve({ data: [] }),
    submissionIds.length ? supabase.from("availability_entries").select("submission_id, shift_template_id, shift_date, status").in("submission_id", submissionIds) : Promise.resolve({ data: [] })
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const workers = (membershipsResult.data ?? []).map((item) => ({ ...item, profile: profileMap.get(item.user_id) ?? null }));

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
      <p className="eyebrow">{organizationResult.data.name}</p>
      <h1><CalendarRange /> בניית סידור עבודה</h1>
      <p>יוצרים את משמרות החודש, משבצים לפי הזמינות ומפרסמים לצוות.</p>
    </div></header>
    <ScheduleBuilderClient
      assignments={assignments ?? []}
      availability={availability ?? []}
      branches={branchesResult.data ?? []}
      currentUserId={user.id}
      leaveRequests={leaveRequestsResult.data ?? []}
      organizationId={organizationId}
      periods={periodsResult.data ?? []}
      shifts={shifts ?? []}
      submissions={submissions ?? []}
      templates={templatesResult.data ?? []}
      workers={workers}
    />
  </main>;
}
