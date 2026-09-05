"use client";

import { useState } from "react";
import { Timer } from "lucide-react";

import { SupportClient } from "@/app/workspace/support/support-client";
import type { Database } from "@/types/database";

type Category = Database["public"]["Enums"]["support_ticket_category"];
type Priority = Database["public"]["Enums"]["support_ticket_priority"];
type TicketStatus = Database["public"]["Enums"]["support_ticket_status"];
type Ticket = { id: string; organization_id: string; organization_name: string; created_by: string; category: Category; priority: Priority; subject: string; description: string; status: TicketStatus; resolution_note: string | null; assigned_to: string | null; created_at: string; updated_at: string; first_responded_at: string | null; resolved_at: string | null; reopened_count: number };

type Stage = "before" | "after";

const beforeTemplate = [
  "1. כמה זמן לוקח לך היום, בממוצע, להכין ולסגור סידור עבודה — כולל איסוף זמינות, הודעות, תיקונים והחלפות?",
  "",
  "2. בערך כמה הודעות/שיחות/תיקונים נדרשים בכל מחזור סידור?",
  "",
  "3. מה החלק שהכי מעצבן או מבזבז לך זמן בתהליך הנוכחי?",
  ""
].join("\n");

const afterTemplate = [
  "1. כמה זמן לקח לך הפעם להכין ולסגור את הסידור עם ShiftPilot — כולל איסוף זמינות, הודעות, תיקונים והחלפות?",
  "",
  "2. בערך כמה הודעות/שיחות/תיקונים היו נדרשים במחזור הזה?",
  "",
  "3. מה החלק שהכי מעצבן או מבזבז זמן עדיין בתהליך?",
  "",
  "4. האם היה משהו ב-ShiftPilot שגרם לך לבזבז זמן שלא היה קיים קודם (למידת המערכת, חוסר ודאות, בדיקות כפולות וכו')?",
  ""
].join("\n");

export function PilotBaselineClient({
  organizationId,
  currentUserId,
  initialTickets
}: {
  organizationId: string;
  currentUserId: string;
  initialTickets: Ticket[];
}) {
  const [stage, setStage] = useState<Stage>("before");

  return <>
    <section className="template-list-card">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">שלב המדידה</p>
          <h2><Timer size={18} /> לפני או אחרי המחזור?</h2>
          <p>ענו על &quot;לפני&quot; פעם אחת, לפני שהעובדים מתחילים להשתמש ב-ShiftPilot. ענו על &quot;אחרי&quot; בסוף אותו מחזור סידור. ההשוואה בין השניים היא המספר שמוכיח את הערך.</p>
        </div>
        <div className="workspace-actions" style={{ display: "flex", gap: "8px" }}>
          <button type="button" className={stage === "before" ? "button primary" : "button"} onClick={() => setStage("before")}>לפני</button>
          <button type="button" className={stage === "after" ? "button primary" : "button"} onClick={() => setStage("after")}>אחרי</button>
        </div>
      </div>
    </section>

    <SupportClient
      key={stage}
      organizationId={organizationId}
      currentUserId={currentUserId}
      canManage={false}
      initialTickets={initialTickets}
      initialCategory="feature"
      initialPriority="normal"
      initialSubject={stage === "before" ? "[Pilot Baseline - Before] כמה זמן לוקח סידור היום" : "[Pilot Baseline - After] כמה זמן לקח עם ShiftPilot"}
      initialDescription={stage === "before" ? beforeTemplate : afterTemplate}
      createEyebrow="Baseline"
      createHeading={stage === "before" ? "לפני שמתחילים: איך זה עובד היום?" : "אחרי המחזור: איך זה עבד עם ShiftPilot?"}
      descriptionLabel="התשובות שלך"
    />
  </>;
}
