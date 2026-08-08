import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, CalendarCheck, CheckCircle2 } from "lucide-react";

import { MarkNotificationsReadButton } from "@/app/workspace/notifications/mark-notifications-read-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function scheduleDetails(payload: unknown, branches: Map<string, string>) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "סידור עבודה חדש זמין.";
  const value = payload as Record<string, unknown>;
  const month = typeof value.month === "number" ? monthNames[value.month - 1] : "";
  const year = typeof value.year === "number" ? String(value.year) : "";
  const branch = typeof value.branch_id === "string" ? branches.get(value.branch_id) : "";
  return [month, year, branch].filter(Boolean).join(" · ") || "סידור עבודה חדש זמין.";
}

export default async function NotificationsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const [{ data: organization }, { data: notifications }, { data: branches }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase
      .from("notifications")
      .select("id, template_key, payload, status, read_at, created_at")
      .eq("organization_id", membership.organization_id)
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id)
  ]);
  if (!organization) redirect("/workspace");

  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]));
  const unreadCount = (notifications ?? []).filter((notification) => !notification.read_at).length;

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader">
      <div>
        <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
        <p className="eyebrow">{organization.name}</p>
        <h1><Bell /> התראות</h1>
        <p>עדכונים חשובים על סידורי עבודה ופעולות שממתינות לך.</p>
      </div>
      <MarkNotificationsReadButton unreadCount={unreadCount} />
    </header>

    <section className="template-list-card">
      <div className="template-list-heading">
        <div><p className="eyebrow">מרכז עדכונים</p><h2>{unreadCount ? `${unreadCount} התראות חדשות` : "הכול מעודכן"}</h2></div>
        <span className={`badge ${unreadCount ? "warning" : "success"}`}>
          {unreadCount ? <Bell size={15} /> : <CheckCircle2 size={15} />}
          {unreadCount ? "ממתינות לקריאה" : "אין התראות חדשות"}
        </span>
      </div>

      <div className="template-list">{(notifications ?? []).map((notification) =>
        <article className={`card notification-card ${notification.read_at ? "" : "unread"}`} key={notification.id}>
          <div className="template-icon"><CalendarCheck /></div>
          <span>
            <strong>{notification.template_key === "schedule_published" ? "סידור העבודה פורסם" : "עדכון חדש"}</strong>
            <small>{scheduleDetails(notification.payload, branchMap)}</small>
            <em>{new Date(notification.created_at).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" })}</em>
          </span>
          {!notification.read_at ? <span className="badge warning">חדש</span> : <span className="badge">נקרא</span>}
        </article>
      )}</div>

      {!(notifications ?? []).length ? <div className="empty-template-state">
        <Bell size={42} />
        <h2>אין עדיין התראות</h2>
        <p>כאשר מנהל יפרסם סידור עבודה, העדכון יופיע כאן.</p>
      </div> : null}
    </section>
  </main>;
}
