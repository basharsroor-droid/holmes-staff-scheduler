import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, History, ShieldCheck } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const entityLabels: Record<string, string> = {
  organizations: "עסק",
  branches: "סניף",
  organization_memberships: "חבר צוות",
  shift_templates: "סוג משמרת",
  schedule_periods: "חודש עבודה"
};

const operationLabels: Record<string, string> = {
  insert: "נוצר",
  update: "עודכן",
  delete: "נמחק"
};

function describeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = metadata as Record<string, unknown>;
  const details: string[] = [];

  if (typeof value.name === "string" && value.name) details.push(value.name);
  if (typeof value.role === "string" && value.role) details.push(`תפקיד: ${value.role}`);
  if (typeof value.status === "string" && value.status) details.push(`סטטוס: ${value.status}`);
  if (value.month && value.year) details.push(`${value.month}/${value.year}`);

  return details.join(" · ");
}

export default async function AuditLogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) redirect("/workspace");

  const [{ data: organization }, { data: events }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase
      .from("audit_logs")
      .select("id, actor_user_id, action, entity_type, entity_id, metadata, created_at")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  if (!organization) redirect("/workspace");

  const actorIds = [...new Set((events ?? []).map((event) => event.actor_user_id).filter((id): id is string => Boolean(id)))];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [
    profile.id,
    `${profile.first_name} ${profile.last_name}`.trim()
  ]));

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader">
      <div>
        <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העסק</Link>
        <p className="eyebrow">{organization.name} · אבטחה ותפעול</p>
        <h1><History /> יומן פעילות</h1>
        <p>מאה פעולות הניהול האחרונות. היומן נכתב אוטומטית במסד הנתונים ואינו כולל סיסמאות, מיילים או Tokens.</p>
      </div>
    </header>

    <section className="template-list-card audit-console">
      <div className="template-list-heading audit-heading">
        <div><p className="eyebrow">מעקב מאובטח</p><h2>פעולות אחרונות</h2></div>
        <span className="badge success"><ShieldCheck size={15} /> בעלים ו-Admin בלבד</span>
      </div>

      {(events ?? []).length ? <div className="table-wrap audit-table-wrap">
        <table className="table compact-table">
          <thead><tr><th>זמן</th><th>מי ביצע</th><th>פעולה</th><th>ישות</th><th>פרטים</th></tr></thead>
          <tbody>{(events ?? []).map((event) => {
            const operation = event.action.split(".").at(-1) ?? "";
            return <tr className={`audit-row operation-${operation}`} key={event.id}>
              <td>{new Date(event.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</td>
              <td>{event.actor_user_id ? profileMap.get(event.actor_user_id) ?? "משתמש מערכת" : "פעולת מערכת"}</td>
              <td><span className="badge">{operationLabels[operation] ?? operation}</span></td>
              <td>{entityLabels[event.entity_type] ?? event.entity_type}</td>
              <td>{describeMetadata(event.metadata) || "—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <div className="empty-template-state">
        <History size={40} />
        <h2>עדיין אין פעולות מתועדות</h2>
        <p>שינויים חדשים בעסק, בצוות, במשמרות ובחודשי העבודה יופיעו כאן אוטומטית.</p>
      </div>}
    </section>
  </main>;
}
