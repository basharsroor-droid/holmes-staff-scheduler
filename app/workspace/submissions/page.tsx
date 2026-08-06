import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { SubmissionsClient } from "@/app/workspace/submissions/submissions-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, branch_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) redirect("/workspace");

  const [organizationResult, branchesResult, periodsResult, membershipsResult, templatesResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id).order("name"),
    supabase.from("schedule_periods").select("id, branch_id, year, month, status, submission_closes_at").eq("organization_id", membership.organization_id).order("year", { ascending: false }).order("month", { ascending: false }),
    supabase.from("organization_memberships").select("id, user_id, branch_id, role").eq("organization_id", membership.organization_id).eq("status", "active").in("role", ["employee", "manager"]),
    supabase.from("shift_templates").select("id, name, start_time, end_time").eq("organization_id", membership.organization_id)
  ]);
  if (!organizationResult.data) redirect("/workspace");

  const userIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const periodIds = (periodsResult.data ?? []).map((item) => item.id);
  const [{ data: profiles }, { data: submissions }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, first_name, last_name, color").in("id", userIds) : Promise.resolve({ data: [] }),
    periodIds.length ? supabase.from("availability_submissions").select("id, schedule_period_id, user_id, submitted_at, manager_note, updated_at").in("schedule_period_id", periodIds) : Promise.resolve({ data: [] })
  ]);
  const submissionIds = (submissions ?? []).map((item) => item.id);
  const { data: entries } = submissionIds.length
    ? await supabase.from("availability_entries").select("id, submission_id, shift_template_id, shift_date, status, note").in("submission_id", submissionIds).order("shift_date")
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const workers = (membershipsResult.data ?? []).map((item) => ({ ...item, profile: profileMap.get(item.user_id) ?? null }));

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
      <p className="eyebrow">{organizationResult.data.name}</p>
      <h1><ClipboardCheck /> מעקב הגשות</h1>
      <p>רואים מי שלח זמינות, מי שמר טיוטה ומי עדיין חסר — עם פירוט מלא לכל עובד.</p>
    </div></header>
    <SubmissionsClient
      branches={branchesResult.data ?? []}
      entries={entries ?? []}
      periods={periodsResult.data ?? []}
      submissions={submissions ?? []}
      templates={templatesResult.data ?? []}
      workers={workers}
    />
  </main>;
}
