import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CalendarPlus } from "lucide-react";

import { MyShiftsClient } from "@/app/workspace/my-shifts/my-shifts-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyShiftsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, branch_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/workspace");

  const [{ data: organization }, { data: branches }, { data: assignments }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id),
    supabase.from("shift_assignments").select("id, shift_id").eq("organization_id", membership.organization_id).eq("user_id", user.id)
  ]);
  if (!organization) redirect("/workspace");

  const shiftIds = (assignments ?? []).map((item) => item.shift_id);
  const { data: shifts } = shiftIds.length
    ? await supabase.from("shifts").select("id, schedule_period_id, shift_date, name, start_time, end_time, manager_note, status").in("id", shiftIds).eq("status", "published").order("shift_date").order("start_time")
    : { data: [] };
  const periodIds = [...new Set((shifts ?? []).map((item) => item.schedule_period_id))];
  const { data: periods } = periodIds.length
    ? await supabase.from("schedule_periods").select("id, branch_id, year, month, status, published_at").in("id", periodIds).eq("status", "published").order("year").order("month")
    : { data: [] };

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
      <p className="eyebrow">{organization.name}</p>
      <h1><CalendarDays /> המשמרות שלי</h1>
      <p>הסידור שפורסם, המשמרת הקרובה וכל שעות העבודה שלך במקום אחד.</p>
      <div className="actions"><Link className="button" href="/workspace/open-shifts"><CalendarPlus size={16} /> צפייה במשמרות פתוחות</Link></div>
    </div></header>
    <MyShiftsClient branches={branches ?? []} periods={periods ?? []} shifts={shifts ?? []} />
  </main>;
}
