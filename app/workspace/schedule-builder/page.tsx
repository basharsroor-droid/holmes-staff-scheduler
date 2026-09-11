import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarRange, ChevronDown, Settings2 } from "lucide-react";

import { ConflictDetectorEnhancer } from "@/app/workspace/schedule-builder/conflict-detector-enhancer";
import { CoverageRulesEnhancer } from "@/app/workspace/schedule-builder/coverage-rules-enhancer";
import { EmployeePreferenceEnhancer } from "@/app/workspace/schedule-builder/employee-preference-enhancer";
import { FairnessEnhancer } from "@/app/workspace/schedule-builder/fairness-enhancer";
import { FixMySchedulePanel } from "@/app/workspace/schedule-builder/fix-my-schedule-panel";
import { OpenShiftsManagerPanel } from "@/app/workspace/schedule-builder/open-shifts-manager-panel";
import { ScheduleBuilderClient } from "@/app/workspace/schedule-builder/schedule-builder-client";
import { ScheduleCalendarOverview } from "@/app/workspace/schedule-builder/schedule-calendar-overview";
import { ScheduleDataProvider } from "@/app/workspace/schedule-builder/schedule-data";
import { ScheduleTemplatesPanel } from "@/app/workspace/schedule-builder/schedule-templates-panel";
import { ShiftPilotScore } from "@/app/workspace/schedule-builder/shiftpilot-score";
import { SmartDraftPanel } from "@/app/workspace/schedule-builder/smart-draft-panel";
import { SmartReplacementPanel } from "@/app/workspace/schedule-builder/smart-replacement-panel";
import { TimeOffApprovalPanel } from "@/app/workspace/schedule-builder/time-off-approval-panel";
import { EmptyState } from "@/components/workspace/empty-state";
import { periodShiftRange, SHIFT_RANGE_LIMIT } from "@/lib/period-window";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SHIFT_COLUMNS =
  "id, schedule_period_id, shift_template_id, shift_date, name, start_time, end_time, required_employees, status, open_for_requests";

// B3 (docs/REMEDIATION_PLAN.md): this page used to load every work month, every
// shift and every assignment the business ever had on each visit. It now loads
// the selected month (?period=, default: the latest) and every organization
// shift within a week of it -- the builder's overlap, weekly-hours and rest
// checks look across months and departments -- plus published future shifts
// for the Open Shifts panel. Shift counts per month come from one small SQL
// function. Five sequential stages: user, membership, and three parallel
// batches.
export default async function ScheduleBuilderPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const organizationId = membership.organization_id;
  const [
    organizationResult,
    branchesResult,
    departmentsResult,
    periodsResult,
    templatesResult,
    membershipsResult,
    departmentMembershipsResult,
    { data: leaveRequests },
    { data: savedTemplates },
    { data: shiftCounts },
    { period: requestedPeriod }
  ] = await Promise.all([
    supabase.from("organizations").select("name, min_rest_hours, pilot_mode").eq("id", organizationId).single(),
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase
      .from("departments")
      .select("id, branch_id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("schedule_periods")
      .select("id, branch_id, department_id, year, month, status, published_at")
      .eq("organization_id", organizationId)
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
    supabase
      .from("shift_templates")
      .select("id, branch_id, department_id, name, start_time, end_time, required_employees, requires_senior_employee")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("start_time"),
    supabase
      .from("organization_memberships")
      .select("id, user_id, branch_id, role, seniority_level, can_open, can_close, weekly_hours_limit")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("role", ["employee", "manager"]),
    supabase
      .from("department_memberships")
      .select("membership_id, department_id")
      .eq("organization_id", organizationId),
    supabase
      .from("leave_requests")
      .select("id, user_id, leave_type, start_date, end_date, note, status")
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: true }),
    supabase
      .from("schedule_templates")
      .select("id, branch_id, department_id, name, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.rpc("period_shift_counts"),
    searchParams
  ]);
  if (!organizationResult.data) redirect("/workspace");
  const pilotMode = !!organizationResult.data.pilot_mode;

  const periods = periodsResult.data ?? [];
  const selectedPeriod =
    periods.find((item) => typeof requestedPeriod === "string" && item.id === requestedPeriod) ?? periods[0];
  const range = selectedPeriod ? periodShiftRange(selectedPeriod.year, selectedPeriod.month) : null;
  const today = new Date().toISOString().slice(0, 10);

  const userIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const [{ data: profiles }, { data: shifts }, { data: submissions }, { data: openShifts }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, color").in("id", userIds)
      : Promise.resolve({ data: [] }),
    range
      ? supabase
          .from("shifts")
          .select(SHIFT_COLUMNS)
          .eq("organization_id", organizationId)
          .gte("shift_date", range.from)
          .lte("shift_date", range.to)
          .order("shift_date")
          .order("start_time")
          .limit(SHIFT_RANGE_LIMIT)
      : Promise.resolve({ data: [] }),
    selectedPeriod
      ? supabase
          .from("availability_submissions")
          .select("id, schedule_period_id, user_id, submitted_at")
          .eq("schedule_period_id", selectedPeriod.id)
      : Promise.resolve({ data: [] }),
    pilotMode
      ? Promise.resolve({ data: [] })
      : supabase
          .from("shifts")
          .select(SHIFT_COLUMNS)
          .eq("organization_id", organizationId)
          .eq("status", "published")
          .gte("shift_date", today)
          .order("shift_date")
          .order("start_time")
          .limit(SHIFT_RANGE_LIMIT)
  ]);
  const shiftIds = [...new Set([...(shifts ?? []), ...(openShifts ?? [])].map((item) => item.id))];
  const openShiftIds = (openShifts ?? []).map((item) => item.id);
  const submissionIds = (submissions ?? []).map((item) => item.id);
  const savedTemplateIds = (savedTemplates ?? []).map((item) => item.id);
  const [{ data: assignments }, { data: availability }, { data: openShiftRequests }, { data: savedTemplateItems }] =
    await Promise.all([
      shiftIds.length
        ? supabase.from("shift_assignments").select("id, shift_id, user_id").in("shift_id", shiftIds)
        : Promise.resolve({ data: [] }),
      submissionIds.length
        ? supabase
            .from("availability_entries")
            .select("submission_id, shift_template_id, shift_date, status")
            .in("submission_id", submissionIds)
        : Promise.resolve({ data: [] }),
      openShiftIds.length
        ? supabase
            .from("open_shift_requests")
            .select("id, shift_id, user_id, status, created_at")
            .in("shift_id", openShiftIds)
            .eq("status", "pending")
            .order("created_at")
        : Promise.resolve({ data: [] }),
      savedTemplateIds.length
        ? supabase
            .from("schedule_template_items")
            .select("schedule_template_id")
            .in("schedule_template_id", savedTemplateIds)
        : Promise.resolve({ data: [] })
    ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const workers = (membershipsResult.data ?? []).map((item) => ({
    ...item,
    department_ids: (departmentMembershipsResult.data ?? [])
      .filter((assignment) => assignment.membership_id === item.id)
      .map((assignment) => assignment.department_id),
    profile: profileMap.get(item.user_id) ?? null
  }));

  const pendingTimeOff = (leaveRequests ?? [])
    .filter((request) => request.status === "pending")
    .map((request) => {
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
    .filter((request) => request.status === "approved")
    .map((request) => ({
      id: request.id,
      user_id: request.user_id,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date
    }));

  const periodMap = new Map(periods.map((item) => [item.id, item]));
  const assignmentCountMap = new Map<string, number>();
  for (const assignment of assignments ?? [])
    assignmentCountMap.set(assignment.shift_id, (assignmentCountMap.get(assignment.shift_id) ?? 0) + 1);
  const managerOpenShifts = (openShifts ?? [])
    .filter((shift) => (assignmentCountMap.get(shift.id) ?? 0) < shift.required_employees)
    .map((shift) => {
      const p = periodMap.get(shift.schedule_period_id);
      return {
        id: shift.id,
        shift_date: shift.shift_date,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        required_employees: shift.required_employees,
        assigned_count: assignmentCountMap.get(shift.id) ?? 0,
        open_for_requests: !!shift.open_for_requests,
        period_label: p ? `${p.month}/${p.year}` : ""
      };
    });
  const managerOpenShiftRequests = (openShiftRequests ?? []).map((request) => {
    const profile = profileMap.get(request.user_id);
    return {
      id: request.id,
      shift_id: request.shift_id,
      employee_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "עובד/ת",
      created_at: request.created_at
    };
  });

  const coverageWorkers = workers.map((worker) => ({
    user_id: worker.user_id,
    seniority_level: worker.seniority_level,
    profile: worker.profile ? { first_name: worker.profile.first_name, last_name: worker.profile.last_name } : null
  }));
  const coverageTemplates = (templatesResult.data ?? []).map((template) => ({
    name: template.name,
    requires_senior_employee: template.requires_senior_employee
  }));

  const periodShiftCounts: Record<string, number> = Object.fromEntries(
    (shiftCounts ?? []).map((row) => [row.schedule_period_id, Number(row.shift_count)])
  );
  const templateItemCount = new Map<string, number>();
  for (const item of savedTemplateItems ?? [])
    templateItemCount.set(item.schedule_template_id, (templateItemCount.get(item.schedule_template_id) ?? 0) + 1);
  const templatePeriods = periods.map((period) => ({
    ...period,
    shift_count: periodShiftCounts[period.id] ?? 0
  }));
  const reusableTemplates = (savedTemplates ?? []).map((template) => ({
    ...template,
    item_count: templateItemCount.get(template.id) ?? 0
  }));

  return (
    <main className="workspace-home" dir="rtl">
      <header className="workspace-subheader">
        <div>
          <Link href="/workspace" className="back-link">
            <ArrowRight size={17} /> חזרה לסביבת העסק
          </Link>
          <p className="eyebrow">{organizationResult.data.name}</p>
          <h1>
            <CalendarRange /> בניית סידור עבודה
          </h1>
          <p>מאשרים Time Off, יוצרים משמרות, משבצים לפי הזמינות ומפרסמים לצוות.</p>
        </div>
      </header>

      {/* One copy of the month's data for the board and every panel (B3). Keyed by
          month: choosing another month navigates (?period=), and everything
          below remounts with that month's server data. */}
      <ScheduleDataProvider
        key={selectedPeriod?.id ?? "none"}
        selectedPeriodId={selectedPeriod?.id ?? ""}
        initialAssignments={assignments ?? []}
        initialShifts={(shifts ?? []).map((shift) => ({
          id: shift.id,
          schedule_period_id: shift.schedule_period_id,
          shift_template_id: shift.shift_template_id,
          shift_date: shift.shift_date,
          name: shift.name,
          start_time: shift.start_time,
          end_time: shift.end_time,
          required_employees: shift.required_employees,
          status: shift.status
        }))}
      >
        <ScheduleCalendarOverview
          period={
            selectedPeriod
              ? {
                  id: selectedPeriod.id,
                  year: selectedPeriod.year,
                  month: selectedPeriod.month
                }
              : null
          }
        />

        <ScheduleBuilderClient
          availability={availability ?? []}
          branches={branchesResult.data ?? []}
          departments={departmentsResult.data ?? []}
          callerRole={membership.role}
          currentUserId={user.id}
          initialMinRestHours={organizationResult.data.min_rest_hours}
          leaveRequests={approvedTimeOff}
          organizationId={organizationId}
          periods={periods}
          periodShiftCounts={periodShiftCounts}
          submissions={submissions ?? []}
          templates={templatesResult.data ?? []}
          workers={workers}
        />

        <details className="schedule-tools-disclosure">
          <summary>
            <span className="schedule-tools-summary-icon">
              <Settings2 size={20} />
            </span>
            <span>
              <strong>כלי ניהול ובקרה</strong>
              <small>בקשות חופשה, תבניות, בדיקות, הוגנות וכלים חכמים</small>
            </span>
            <ChevronDown className="schedule-tools-chevron" size={20} />
          </summary>
          <div className="schedule-tools-content">
            <TimeOffApprovalPanel initialRequests={pendingTimeOff} />
            {!pilotMode && (
              <OpenShiftsManagerPanel initialShifts={managerOpenShifts} initialRequests={managerOpenShiftRequests} />
            )}
            <CoverageRulesEnhancer workers={coverageWorkers} templates={coverageTemplates} />
            <ScheduleTemplatesPanel periods={templatePeriods} initialTemplates={reusableTemplates} />
            <EmployeePreferenceEnhancer />
            <ConflictDetectorEnhancer
              periods={periods}
              workers={workers}
              submissions={submissions ?? []}
              availability={availability ?? []}
              approvedLeave={approvedTimeOff}
              minRestHours={organizationResult.data.min_rest_hours}
            />
            {pilotMode && (
              <section className="template-list-card">
                <EmptyState
                  icon={CalendarRange}
                  iconSize={32}
                  title="מצב פיילוט פעיל"
                  description="כדי לשמור על מחזור סידור פשוט וברור, כלי ה-Intelligence (ציון בריאות, הוגנות, טיוטה חכמה, תיקון סידור, החלפה חכמה ומשמרות פתוחות) מוסתרים בשלב זה. הם ייפתחו בהדרגה אחרי מחזור ראשון נקי."
                />
              </section>
            )}
            {!pilotMode && (
              <ShiftPilotScore
                periods={periods}
                workers={workers}
                submissions={submissions ?? []}
                availability={availability ?? []}
                approvedLeave={approvedTimeOff}
                minRestHours={organizationResult.data.min_rest_hours}
              />
            )}
            {!pilotMode && (
              <FairnessEnhancer
                periods={periods}
                workers={workers}
                submissions={submissions ?? []}
                availability={availability ?? []}
              />
            )}
            {!pilotMode && (
              <FixMySchedulePanel
                organizationId={organizationId}
                currentUserId={user.id}
                periods={periods}
                workers={workers}
                submissions={submissions ?? []}
                availability={availability ?? []}
                approvedLeave={approvedTimeOff}
                templates={templatesResult.data ?? []}
                minRestHours={organizationResult.data.min_rest_hours}
              />
            )}
            {!pilotMode && (
              <SmartReplacementPanel
                organizationId={organizationId}
                currentUserId={user.id}
                periods={periods}
                workers={workers}
                submissions={submissions ?? []}
                availability={availability ?? []}
                approvedLeave={approvedTimeOff}
                templates={templatesResult.data ?? []}
                minRestHours={organizationResult.data.min_rest_hours}
              />
            )}
            {!pilotMode && (
              <SmartDraftPanel
                organizationId={organizationId}
                currentUserId={user.id}
                periods={periods}
                workers={workers}
                submissions={submissions ?? []}
                availability={availability ?? []}
                approvedLeave={approvedTimeOff}
                templates={templatesResult.data ?? []}
                minRestHours={organizationResult.data.min_rest_hours}
              />
            )}
          </div>
        </details>
      </ScheduleDataProvider>
    </main>
  );
}
