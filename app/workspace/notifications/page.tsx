import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, CalendarCheck, CheckCircle2 } from "lucide-react";

import { MarkNotificationsReadButton } from "@/app/workspace/notifications/mark-notifications-read-button";
import { NotificationPreferences, type PreferenceValues } from "@/app/workspace/notifications/notification-preferences";
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

function notificationCopy(templateKey: string, payload: unknown, branches: Map<string, string>) {
  if (templateKey === "schedule_published") {
    return { title: "סידור העבודה פורסם", details: scheduleDetails(payload, branches), href: "/workspace/my-shifts" };
  }

  if (templateKey === "shift_assignment_changed") return { title: "השיבוץ שלך עודכן", details: "בוצע שינוי במשמרת שפורסמה.", href: "/workspace/my-shifts" };
  if (templateKey === "shift_reminder") return { title: "המשמרת מתחילה בעוד כשעה", details: scheduleDetails(payload, branches), href: "/workspace/my-shifts" };
  if (templateKey === "availability_reminder") return { title: "תזכורת להגשת זמינות", details: "חלון ההגשה עומד להיסגר.", href: "/workspace/availability" };
  if (templateKey === "availability_closing") return { title: "הגשת הזמינות נסגרת היום", details: "זו ההזדמנות האחרונה להשלים את ההגשה.", href: "/workspace/availability" };

  const swapCopy: Record<string, { title: string; details: string }> = {
    swap_request_received: { title: "התקבלה בקשת החלפה", details: "עובד/ת מבקש/ת להחליף איתך משמרת." },
    swap_waiting_manager: { title: "החלפה ממתינה לאישור מנהל", details: "שני העובדים אישרו והבקשה מוכנה להחלטה." },
    swap_approved: { title: "החלפת המשמרת אושרה", details: "הסידור עודכן בהתאם להחלפה שאושרה." },
    swap_rejected: { title: "בקשת ההחלפה נדחתה", details: "הבקשה נסגרה ללא שינוי בסידור." },
    swap_cancelled: { title: "בקשת ההחלפה בוטלה", details: "הבקשה בוטלה ללא שינוי בסידור." }
  };
  return { ...(swapCopy[templateKey] ?? { title: "עדכון חדש", details: "יש עדכון חדש במערכת." }), href: "/workspace/shift-swaps" };
}

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
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

  const [{ data: organization }, { data: notifications }, { data: branches }, { data: preferences }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase
      .from("notifications")
      .select("id, template_key, payload, status, read_at, created_at")
      .eq("organization_id", membership.organization_id)
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("branches").select("id, name").eq("organization_id", membership.organization_id),
    supabase.from("notification_preferences").select("schedule_published, shift_changes, shift_reminders, availability_reminders, swap_updates").eq("organization_id", membership.organization_id).eq("user_id", user.id).maybeSingle()
  ]);
  if (!organization) redirect("/workspace");

  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]));
  const unreadCount = (notifications ?? []).filter((notification) => !notification.read_at).length;
  const initialPreferences: PreferenceValues = preferences ?? { schedule_published: true, shift_changes: true, shift_reminders: true, availability_reminders: true, swap_updates: true };

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

      <div className="template-list">{(notifications ?? []).map((notification) => {
        const copy = notificationCopy(notification.template_key, notification.payload, branchMap);
        return <article className={`card notification-card ${notification.read_at ? "" : "unread"}`} key={notification.id}>
          <div className="template-icon">{notification.template_key === "schedule_published" ? <CalendarCheck /> : <Bell />}</div>
          <span>
            <strong>{copy.title}</strong>
            <small>{copy.details}</small>
            <em>{new Date(notification.created_at).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" })}</em>
          </span>
          <Link className="button" href={copy.href}>{notification.read_at ? "פתיחה" : "צפייה"}</Link>
        </article>;
      })}</div>

      {!(notifications ?? []).length ? <div className="empty-template-state">
        <Bell size={42} />
        <h2>אין עדיין התראות</h2>
        <p>כאשר מנהל יפרסם סידור עבודה, העדכון יופיע כאן.</p>
      </div> : null}
    </section>
    <NotificationPreferences organizationId={membership.organization_id} userId={user.id} initial={initialPreferences} />
  </main>;
}
