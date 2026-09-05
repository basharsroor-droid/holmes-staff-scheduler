import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, ArrowRight, CalendarRange, CheckCircle2, ClipboardCheck, Gauge, Palmtree, PlusCircle, Repeat2, Store, Users } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Period = { id: string; department_id: string; branch_id: string | null; year: number; month: number; status: string; published_at: string | null };
type Shift = { id: string; required_employees: number; open_for_requests: boolean; status: string };
type Assignment = { shift_id: string };

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function periodStatusLabel(status: string) {
  return ({ collecting: "פתוח להגשת זמינות", draft: "טיוטת סידור", published: "פורסם" } as Record<string, string>)[status] ?? status;
}

export default async function ManagerCommandCenterPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships").select("id, organization_id, branch_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/workspace");
  if (membership.role === "employee") redirect("/workspace");

  const [{ data: organization }, { data: managerDepartments }] = await Promise.all([
    supabase.from("organizations").select("name, pilot_mode").eq("id", membership.organization_id).single(),
    membership.role === "manager" ? supabase.from("department_memberships").select("department_id").eq("membership_id", membership.id) : Promise.resolve({ data: [] })
  ]);
  if (!organization) redirect("/workspace");
  const pilotMode = !!(organization as any).pilot_mode;

  const departmentIds = (managerDepartments ?? []).map((row) => row.department_id);
  let periodQuery = supabase.from("schedule_periods").select("id, department_id, branch_id, year, month, status, published_at").eq("organization_id", membership.organization_id).order("year", { ascending: false }).order("month", { ascending: false });
  if (membership.branch_id) periodQuery = periodQuery.eq("branch_id", membership.branch_id);
  if (membership.role === "manager" && departmentIds.length) periodQuery = periodQuery.in("department_id", departmentIds);
  if (membership.role === "manager" && !departmentIds.length) {
    return <main className="workspace-home" dir="rtl"><header className="workspace-subheader"><div><Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link><p className="eyebrow">מרכז שליטה למנהל</p><h1><Activity /> מרכז שליטה למנהל</h1><p>אין לך כרגע מחלקה פעילה לניהול.</p></div></header></main>;
  }

  const { data: periodRows } = await periodQuery;
  const periods = (periodRows ?? []) as Period[];
  const activePeriod = periods.find((period) => ["draft", "published", "collecting"].includes(period.status)) ?? periods[0] ?? null;
  const { data: shiftsData } = activePeriod ? await (supabase as any).from("shifts").select("id, required_employees, open_for_requests, status").eq("schedule_period_id", activePeriod.id).neq("status", "cancelled") : { data: [] };
  const shifts = (shiftsData ?? []) as Shift[];
  const shiftIds = shifts.map((shift) => shift.id);

  const [{ data: assignmentsData }, { data: marketplaceRequests }, { data: leaveRequests }, { data: swapRequests }] = await Promise.all([
    shiftIds.length ? supabase.from("shift_assignments").select("shift_id").in("shift_id", shiftIds) : Promise.resolve({ data: [] }),
    shiftIds.length ? (supabase as any).from("open_shift_requests").select("id, shift_id").eq("status", "pending").in("shift_id", shiftIds) : Promise.resolve({ data: [] }),
    (supabase as any).from("leave_requests").select("id").eq("organization_id", membership.organization_id).eq("status", "pending"),
    supabase.from("swap_requests").select("id").eq("organization_id", membership.organization_id).eq("status", "pending_manager")
  ]);

  const assignmentCounts = new Map<string, number>();
  for (const row of (assignmentsData ?? []) as Assignment[]) assignmentCounts.set(row.shift_id, (assignmentCounts.get(row.shift_id) ?? 0) + 1);
  const totalRequired = shifts.reduce((sum, shift) => sum + Math.max(0, shift.required_employees), 0);
  const totalAssigned = shifts.reduce((sum, shift) => sum + Math.min(shift.required_employees, assignmentCounts.get(shift.id) ?? 0), 0);
  const coverage = totalRequired ? Math.round((totalAssigned / totalRequired) * 100) : null;
  const understaffed = shifts.filter((shift) => (assignmentCounts.get(shift.id) ?? 0) < shift.required_employees).length;
  const openShifts = shifts.filter((shift) => shift.open_for_requests).length;
  const pendingMarketplace = marketplaceRequests?.length ?? 0;
  const pendingLeave = leaveRequests?.length ?? 0;
  const pendingSwaps = swapRequests?.length ?? 0;
  const pendingTotal = (pilotMode ? 0 : pendingMarketplace) + pendingLeave + pendingSwaps;

  const actions = [
    understaffed > 0 ? { href: "/workspace/schedule-builder", label: `לטפל ב-${understaffed} משמרות עם כיסוי חסר`, detail: pilotMode ? "פתחו את בדיקת הקונפליקטים וקבלו תמונה ברורה של הבעיה לפני ביצוע שינוי." : "פתחו את בדיקת הקונפליקטים או את כלי תיקון הסידור וקבלו תוכנית תיקון מוסברת לפני ביצוע שינוי.", priority: "critical" } : null,
    !pilotMode && pendingMarketplace > 0 ? { href: "/workspace/open-shifts", label: `להכריע ב-${pendingMarketplace} בקשות למשמרות פתוחות`, detail: "בדקו את הזכאות המעודכנת לפני אישור. ההחלטה נשארת אצל המנהל.", priority: "warning" } : null,
    pendingLeave > 0 ? { href: "/workspace/schedule-builder", label: `לבדוק ${pendingLeave} בקשות חופשה או היעדרות`, detail: "אישור בקשת היעדרות הופך מיד לאילוץ קשיח ומונע שיבוץ בטווח המאושר.", priority: "warning" } : null,
    pendingSwaps > 0 ? { href: "/workspace/shift-swaps", label: `להכריע ב-${pendingSwaps} בקשות החלפה`, detail: "בדקו את הבקשה והעובד החלופי לפני אישור. ההחלפה לא מתבצעת ללא אישור מנהל.", priority: "warning" } : null
  ].filter(Boolean) as Array<{ href: string; label: string; detail: string; priority: string }>;

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div><Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link><p className="eyebrow">{organization.name} · תמונת מצב ניהולית</p><h1><Activity /> מרכז שליטה למנהל</h1><p>כל מה שדורש תשומת לב והפעולה הבאה במקום אחד — בלי לפרסם או לשנות סידור אוטומטית.</p></div></header>

    {!activePeriod ? <section className="template-list-card"><div className="empty-template-state"><CalendarRange size={44} /><h2>עדיין לא נפתחה תקופת עבודה</h2><p>כדי לקבל תמונת מצב אמיתית על כיסוי, בקשות והמלצות פעולה, פתחו קודם תקופת עבודה שבועית או חודשית.</p><Link className="button primary" href="/workspace/work-months"><PlusCircle size={16} /> פתיחת תקופת עבודה</Link></div></section> : <>
      <section className="template-list-card"><div className="template-list-heading"><div><p className="eyebrow">תמונת מצב</p><h2>{monthLabel(activePeriod.year, activePeriod.month)}</h2><p>סטטוס: {periodStatusLabel(activePeriod.status)}</p></div><Link className="button" href="/workspace/schedule-builder"><CalendarRange size={16} /> לסידור המלא</Link></div><div className="workspace-stats schedule-stats"><article><Gauge /><span><strong>{coverage ?? "—"}{coverage !== null ? "%" : ""}</strong><small>כיסוי תקנים</small></span></article><article><AlertTriangle /><span><strong>{understaffed}</strong><small>משמרות עם חוסר</small></span></article><article><ClipboardCheck /><span><strong>{pendingTotal}</strong><small>החלטות שממתינות למנהל</small></span></article></div></section>
      <section className="workspace-next workspace-next-primary"><div><p className="eyebrow">תיבת החלטות</p><h2>מה מחכה להחלטה שלך</h2></div><div className="workspace-actions">{!pilotMode && <Link href="/workspace/open-shifts"><Store /><span><strong>Shift Marketplace</strong><small>{openShifts} משמרות פתוחות · {pendingMarketplace} בקשות ממתינות.</small></span><span className={`status-chip ${pendingMarketplace ? "warning" : "active"}`}>{pendingMarketplace}</span></Link>}<Link href="/workspace/schedule-builder"><Palmtree /><span><strong>חופשות והיעדרויות</strong><small>בקשות שממתינות לאישור מנהל.</small></span><span className={`status-chip ${pendingLeave ? "warning" : "active"}`}>{pendingLeave}</span></Link><Link href="/workspace/shift-swaps"><Repeat2 /><span><strong>החלפות משמרת</strong><small>בקשות שכבר הגיעו לשלב אישור המנהל.</small></span><span className={`status-chip ${pendingSwaps ? "warning" : "active"}`}>{pendingSwaps}</span></Link><Link href="/workspace/employees"><Users /><span><strong>צוות והרשאות</strong><small>ניהול עובדים, תפקידים והרשאות.</small></span><span className="status-chip active">פתיחה</span></Link></div></section>
      <section className="template-list-card"><div className="template-list-heading"><div><p className="eyebrow">המלצות פעולה</p><h2>הפעולות הבאות</h2><p>המלצות בלבד. כל שינוי משמעותי נשאר בשליטת המנהל.</p></div></div>{actions.length ? <div className="template-list">{actions.map((action) => <Link className="template-item" href={action.href} key={action.label}><div className="template-main"><strong>{action.label}</strong><span>{action.detail}</span></div><span className={`badge ${action.priority}`}>לטיפול</span></Link>)}</div> : <div className="submission-banner open"><div><CheckCircle2 /><strong>אין כרגע פעולות דחופות</strong><span>הכיסוי מלא ואין בקשות שממתינות להחלטת מנהל.</span></div></div>}</section>
      {!pilotMode && <section className="workspace-next workspace-next-compact"><div><p className="eyebrow">בדיקות חכמות</p><h2>בדיקה עמוקה ותיקון</h2></div><div className="workspace-actions"><Link href="/workspace/schedule-builder"><Gauge /><span><strong>ShiftPilot Score ובדיקת קונפליקטים</strong><small>ציון בריאות והוגנות, יצירת טיוטה חכמה, תיקון סידור והחלפה חכמה — הכול לבדיקה לפני אישור.</small></span><span className="status-chip active">פתיחה</span></Link></div></section>}
    </>}
  </main>;
}
