import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquareText } from "lucide-react";

import { SupportClient } from "@/app/workspace/support/support-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function feedbackTemplate(role: string) {
  if (role === "employee") {
    return [
      "1. האם היה ברור איך להגיש זמינות?",
      "",
      "2. האם היה ברור איפה רואים את הסידור?",
      "",
      "3. האם Time Off / החלפת משמרת היו ברורים כשנזקקת להם?",
      "",
      "4. האם קיבלת את המידע בזמן הנכון?",
      "",
      "5. מה היה מבלבל, מיותר או חסר?",
      ""
    ].join("\n");
  }

  return [
    "1. מה היה השלב שלקח הכי הרבה זמן במחזור הסידור?",
    "",
    "2. איפה היית צריך לבדוק או לנהל משהו מחוץ ל-ShiftPilot?",
    "",
    "3. האם ההמלצות והבדיקות היו ברורות ומועילות?",
    "",
    "4. כמה תיקונים ידניים בערך עשית לפני הפרסום?",
    "",
    "5. מה הדבר האחד שחייב להשתפר לפני המחזור הבא?",
    ""
  ].join("\n");
}

export default async function PilotFeedbackPage() {
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
  if (!membership) redirect("/workspace");

  const { data: organization } = await supabase.from("organizations").select("name").eq("id", membership.organization_id).single();
  if (!organization) redirect("/workspace");

  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, organization_id, organization_name, created_by, category, priority, subject, description, status, resolution_note, assigned_to, created_at, updated_at, first_responded_at, resolved_at, reopened_count")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const isEmployee = membership.role === "employee";
  const subject = isEmployee ? "[Pilot Feedback] משוב עובד — המחזור הראשון" : "[Pilot Feedback] משוב מנהל — המחזור הראשון";

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href={isEmployee ? "/workspace" : "/workspace/pilot-launch"} className="back-link"><ArrowRight size={17} /> חזרה</Link>
      <p className="eyebrow">{organization.name} · פיילוט ראשון</p>
      <h1><MessageSquareText /> משוב על המחזור הראשון</h1>
      <p>המשוב נשמר כפנייה מסודרת במרכז התמיכה כדי שנוכל לעקוב, לתעד החלטות ולסגור שיפורים לפני הרחבת הפיילוט.</p>
    </div></header>

    <SupportClient
      organizationId={membership.organization_id}
      currentUserId={user.id}
      canManage={false}
      initialTickets={tickets ?? []}
      initialCategory="feature"
      initialPriority="normal"
      initialSubject={subject}
      initialDescription={feedbackTemplate(membership.role)}
      createEyebrow="משוב פיילוט"
      createHeading={isEmployee ? "איך היה המחזור הראשון מבחינתך?" : "איך עבר מחזור הסידור הראשון?"}
      descriptionLabel="המשוב שלך"
    />
  </main>;
}
