import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarRange } from "lucide-react";

import { ScheduleBuilderClient } from "@/app/workspace/schedule-builder/schedule-builder-client";
import { TimeOffApprovalPanel } from "@/app/workspace/schedule-builder/time-off-approval-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ScheduleBuilderPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const organizationId = membership.organization_id;
  const [organizationResult, branchesResult, departmentsResult, periodsResult, templatesResult, membershipsResult, departmentMembershipsResult] = await Promise.all([
    supabase.from("organizations").select("name, min_rest_hours").eq("id", organizationId).single(),
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("departments").select("id, branch_id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("schedule_periods").select("id, branch_id, department_id, year, month, status, published_at").eq("organization_id", organizationId).order("year", { ascending: false }).order("month", { ascending: false }),
    supabase.from("shift_templates").select("id, branch_id, department_id, name, start_time, end_time, required_employees, requires_senior_employee").eq("organization_id", organizationId).eq("active", true).order("start_time"),
    supabase.from("organization_memberships").select("id, user_id, branch_id, role, seniority_level, can_open, can_close, weekly_hours_limit").eq("organization_id", organizationId).eq("status", "active").in("role", ["employee", "manager"]),
    supabase.from("department_memberships").select("membership_id, department_id").eq("organization_id", organizationId)
  ]);
  if (!organizationResult.data) redirect("/workspace");

  const db = supabase as any;
  const { data: leaveRequests } = await db
    .from("leave_requests")
    .select("id, user_id, leave_type, start_date, end_date, note, status")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: true });

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
  const workers = (membershipsResult.data ?? []).map((item) => ({
    ...item,
    department_ids: (departmentMembershipsResult.data ?? []).filter((assignment) => assignment.membership_id === item.id).map((assignment) => assignment.department_id),
    profile: profileMap.get(item.user_id) ?? null
  }));

  const pendingTimeOff = (leaveRequests ?? [])
    .filter((request: any) => request.status === "pending")
    .map((request: any) => {
      const profile = profileMap.get(request.user_id);
      return {
        id: request.id,
        user_id: request.user_id,
        employee_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "עובד/ת",
        leave_type: request.leave_type,
        start_date: request.start_date,
        end_date: request.end_date,
        note: request.note
      };
    });

  const approvedTimeOff = (leaveRequests ?? [])
    .filter((request: any) => request.status === "approved")
    .map((request: any) => ({
      id: request.id,
      user_id: request.user_id,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date
    }));

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
      <p className="eyebrow">{organizationResult.data.name}</p>
      <h1><CalendarRange /> בניית סידור עבודה</h1>
      <p>מאשרים Time Off, יוצרים משמרות, משבצים לפי הזמינות ומפרסמים לצוות.</p>
    </div></header>

    <TimeOffApprovalPanel initialRequests={pendingTimeOff} />

    <ScheduleBuilderClient
      assignments={assignments ?? []}
      availability={availability ?? []}
      branches={branchesResult.data ?? []}
      departments={departmentsResult.data ?? []}
      callerRole={membership.role}
      currentUserId={user.id}
      initialMinRestHours={organizationResult.data.min_rest_hours}
      leaveRequests={approvedTimeOff}
      organizationId={organizationId}
      periods={periodsResult.data ?? []}
      shifts={shifts ?? []}
      submissions={submissions ?? []}
      templates={templatesResult.data ?? []}
      workers={workers}
    />
  </main>;
}
