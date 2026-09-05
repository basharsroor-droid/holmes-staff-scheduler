import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarPlus } from "lucide-react";

import { OpenShiftsClient } from "@/app/workspace/open-shifts/open-shifts-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OpenShiftRequestSummary = {
  id: string;
  shift_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
};

export default async function OpenShiftsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/workspace");

  const { data: departmentMemberships } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("membership_id", membership.id);
  const departmentIds = (departmentMemberships ?? []).map((item) => item.department_id);
  if (!departmentIds.length) {
    return <main className="workspace-home" dir="rtl"><header className="workspace-subheader"><div><Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link><p className="eyebrow">Open Shifts</p><h1><CalendarPlus /> משמרות פתוחות</h1><p>אין לך כרגע שיוך למחלקה פעילה.</p></div></header><OpenShiftsClient initialShifts={[]} /></main>;
  }

  const [{ data: organization }, { data: periods }] = await Promise.all([
    supabase.from("organizations").select("name, pilot_mode").eq("id", membership.organization_id).single(),
    supabase.from("schedule_periods").select("id, branch_id, department_id").eq("organization_id", membership.organization_id).eq("status", "published").in("department_id", departmentIds)
  ]);
  if (!organization) redirect("/workspace");
  if ((organization as any).pilot_mode) {
    return <main className="workspace-home" dir="rtl"><header className="workspace-subheader"><div><Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link><p className="eyebrow">{organization.name} · פיילוט ראשון</p><h1><CalendarPlus /> משמרות פתוחות</h1><p>Shift Marketplace עדיין לא פעיל בשלב הפיילוט. אם יש משמרת שצריך לאייש, פנו למנהל ישירות.</p></div></header></main>;
  }

  const periodIds = (periods ?? []).map((item) => item.id);
  const { data: shifts } = periodIds.length
    ? await (supabase as any).from("shifts").select("id, schedule_period_id, shift_date, name, start_time, end_time, required_employees, open_for_requests").in("schedule_period_id", periodIds).eq("status", "published").eq("open_for_requests", true).order("shift_date").order("start_time")
    : { data: [] };

  const shiftIds = (shifts ?? []).map((item: any) => item.id);
  const [{ data: assignments }, { data: requests }] = await Promise.all([
    shiftIds.length ? supabase.from("shift_assignments").select("shift_id").in("shift_id", shiftIds) : Promise.resolve({ data: [] }),
    shiftIds.length ? (supabase as any).from("open_shift_requests").select("id, shift_id, status").eq("user_id", user.id).in("shift_id", shiftIds) : Promise.resolve({ data: [] })
  ]);

  const periodMap = new Map((periods ?? []).map((item) => [item.id, item]));
  const branchIds = [...new Set((periods ?? []).map((item) => item.branch_id))];
  const [{ data: branches }, { data: departments }] = await Promise.all([
    branchIds.length ? supabase.from("branches").select("id, name").in("id", branchIds) : Promise.resolve({ data: [] }),
    supabase.from("departments").select("id, name").in("id", departmentIds)
  ]);
  const branchMap = new Map((branches ?? []).map((item) => [item.id, item.name]));
  const departmentMap = new Map((departments ?? []).map((item) => [item.id, item.name]));
  const requestMap = new Map<string, OpenShiftRequestSummary>(
    ((requests ?? []) as OpenShiftRequestSummary[]).map((item) => [item.shift_id, item])
  );
  const assignmentCounts = new Map<string, number>();
  for (const assignment of assignments ?? []) assignmentCounts.set(assignment.shift_id, (assignmentCounts.get(assignment.shift_id) ?? 0) + 1);

  const openShifts = (shifts ?? [])
    .filter((shift: any) => (assignmentCounts.get(shift.id) ?? 0) < shift.required_employees)
    .map((shift: any) => {
      const period = periodMap.get(shift.schedule_period_id);
      const request = requestMap.get(shift.id);
      return {
        id: shift.id,
        shift_date: shift.shift_date,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        branch_name: period ? (branchMap.get(period.branch_id) ?? "סניף") : "סניף",
        department_name: period ? (departmentMap.get(period.department_id) ?? "מחלקה") : "מחלקה",
        requested: request?.status === "pending",
        request_id: request?.status === "pending" ? request.id : null,
        request_status: request?.status ?? null
      };
    });

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
      <p className="eyebrow">{organization.name}</p>
      <h1><CalendarPlus /> משמרות פתוחות</h1>
      <p>בחרו משמרת פתוחה, שלחו בקשה והמנהל יאשר לפני שהסידור יתעדכן.</p>
    </div></header>
    <OpenShiftsClient initialShifts={openShifts} />
  </main>;
}
