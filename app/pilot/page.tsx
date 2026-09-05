import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MonitorSmartphone,
  ShieldCheck,
  Users,
  Wand2
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { demoOrganization } from "@/lib/app-config";
import {
  availability,
  employees,
  scheduledShifts,
  shiftTemplates,
  swapRequests
} from "@/lib/mock-data";
import { validateSchedule } from "@/lib/shift-validation";

const pilotSteps = [
  {
    title: "העובדים מגישים זמינות",
    body: "הגשה פשוטה מהטלפון, בלי לאסוף הודעות ידנית."
  },
  {
    title: "המנהל בונה את הסידור",
    body: "עובדים זמינים מוצגים לפי המשמרת, עם בדיקות בסיסיות בזמן העבודה."
  },
  {
    title: "בודקים ומפרסמים",
    body: "עוברים על חוסרים או התנגשויות ומפרסמים רק כשהמנהל מאשר."
  },
  {
    title: "מטפלים בשינויים",
    body: "החלפות ובקשות נשארות בתוך אותו תהליך במקום להתפזר בין הודעות."
  }
];

const demoChecklist = [
  "הגשת זמינות של עובד תוך פחות מדקה",
  "בניית סידור לפי זמינות אמיתית",
  "זיהוי חוסרים ובעיות לפני הפרסום",
  "פרסום סידור סופי לעובדים",
  "טיפול בהחלפות ובקשות לאחר הפרסום"
];

export default function PilotPage() {
  const warnings = validateSchedule(
    scheduledShifts,
    employees,
    availability,
    shiftTemplates
  );
  const staffCount = employees.filter((employee) => employee.role === "employee").length;
  const openShifts = scheduledShifts.filter((shift) => !shift.employeeIds.length).length;
  const availabilitySubmitters = new Set(availability.map((entry) => entry.employeeId)).size;
  const pendingSwaps = swapRequests.filter((request) =>
    ["pending_employee", "pending_manager"].includes(request.status)
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="דמו עסקי"
        title="ShiftPilot — מחזור הסידור במקום אחד"
        description={`סביבת הדגמה ממוקדת שמציגה את המסלול האמיתי: הגשת זמינות, בניית סידור, פרסום וטיפול בשינויים. הנתונים בדמו מוצגים עבור ${demoOrganization.branchName}.`}
        actions={
          <>
            <Link className="button primary" href="/manager">
              מרכז הניהול
            </Link>
            <Link className="button" href="/employee">
              תצוגת עובד
            </Link>
          </>
        }
      />

      <div className="template-workbench" style={{ marginTop: 8 }}>
        <section className="template-list-card">
          <div className="template-list-heading">
            <div>
              <p className="eyebrow">מסלול הדגמה מומלץ</p>
              <h2>מה כדאי להראות קודם</h2>
              <p style={{ color: "var(--muted)", marginBottom: 0 }}>
                מתחילים מהליבה. אין צורך לעבור על כל יכולת במערכת כדי להבין את הערך.
              </p>
            </div>
          </div>

          <div className="workspace-actions">
            <Link href="/availability">
              <CalendarCheck />
              <span>
                <strong>1. הגשת זמינות</strong>
                <small>איך עובד מגיש את הזמינות שלו בצורה ברורה ומהירה.</small>
              </span>
              <span className="status-chip active">עובד</span>
            </Link>
            <Link href="/manager/schedule">
              <Wand2 />
              <span>
                <strong>2. בניית סידור</strong>
                <small>איך המנהל עובר מזמינות לשיבוץ מסודר בלי לרדוף אחרי הודעות.</small>
              </span>
              <span className="status-chip">מנהל</span>
            </Link>
            <Link href="/schedule">
              <CalendarCheck />
              <span>
                <strong>3. פרסום ותצוגה סופית</strong>
                <small>הסידור המוכן כפי שהוא מוצג לצוות לאחר אישור המנהל.</small>
              </span>
              <span className="status-chip">צוות</span>
            </Link>
          </div>
        </section>

        <section className="template-list-card">
          <div className="template-list-heading">
            <div>
              <p className="eyebrow">הדגמה ממוקדת</p>
              <h2>מה לבדוק בדמו</h2>
            </div>
          </div>
          <div className="warning-list">
            {demoChecklist.map((item) => (
              <div className="mini-row" key={item}>
                <CheckCircle2 size={18} color="var(--green)" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <StatCard icon={Users} label="עובדים בדמו" value={staffCount} />
        <StatCard icon={CalendarCheck} label="הגישו זמינות" value={availabilitySubmitters} />
        <StatCard icon={ShieldCheck} label="אזהרות לבדיקה" value={warnings.length} />
        <StatCard icon={Clock3} label="משמרות פתוחות" value={openShifts} />
      </div>

      <div className="template-workbench" style={{ marginTop: 18 }}>
        <section className="template-list-card">
          <div className="template-list-heading">
            <div>
              <p className="eyebrow">מחזור עבודה</p>
              <h2>איך ShiftPilot נכנס לשגרה</h2>
            </div>
          </div>
          <div className="timeline-list">
            {pilotSteps.map((step, index) => (
              <article className="timeline-row" key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="template-list-card">
          <div className="template-list-heading">
            <div>
              <p className="eyebrow">שתי נקודות מבט</p>
              <h2>עובד ומנהל</h2>
            </div>
          </div>
          <div className="feature-list">
            <div className="feature-row">
              <MonitorSmartphone size={20} />
              <span>העובד מגיש זמינות, רואה את הסידור ומטפל בשינויים מהטלפון.</span>
            </div>
            <div className="feature-row">
              <Wand2 size={20} />
              <span>המנהל מרכז את ההגשות, בונה את הסידור ומחליט מתי לפרסם.</span>
            </div>
            <div className="feature-row">
              <ShieldCheck size={20} />
              <span>המערכת מסמנת בעיות לפני שהן מגיעות לעובדים.</span>
            </div>
          </div>
          <div className="card-muted" style={{ marginTop: 16 }}>
            בקשות החלפה שממתינות כרגע בדמו: <strong>{pendingSwaps}</strong>
          </div>
        </section>
      </div>
    </>
  );
}
