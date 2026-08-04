import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  Users,
  Wand2
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
    title: "22 לחודש",
    body: "המערכת פותחת הגשת זמינות לחודש הבא ושולחת תזכורת לעובדים."
  },
  {
    title: "22-28 לחודש",
    body: "כל עובד מגיש זמינות מהטלפון לפי פתיחה, אמצע 1, אמצע 2 וסגירה."
  },
  {
    title: "28 לחודש",
    body: "ההגשה ננעלת אוטומטית, עם אפשרות פתיחה ידנית למנהלת."
  },
  {
    title: "בניית סידור",
    body: "המנהלת רואה רק עובדים זמינים לכל משמרת ומקבלת אזהרות בזמן השיבוץ."
  },
  {
    title: "פרסום",
    body: "העובדים רואים לוח סופי נקי ואת המשמרות האישיות שלהם."
  }
];

const demoChecklist = [
  "הגשת זמינות של עובד תוך פחות מדקה",
  "שיבוץ יום עבודה לפי עובדים זמינים בלבד",
  "אזהרות על משמרות פתוחות או שיבוץ בעייתי",
  "פרסום סידור סופי והורדה לאקסל",
  "בקשות החלפה ובקשות למנהלת"
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
        eyebrow="מצב הצגה"
        title="פיילוט Holmes Place לניהול סידור עבודה"
        description="מסך אחד להצגה מול מנהלת: מה העובדים עושים, מה המנהלת מקבלת, ואיך נראה תהליך העבודה החודשי."
        actions={
          <>
            <Link className="button primary" href="/manager">
              שולחן מנהלת
            </Link>
            <Link className="button" href="/employee">
              גרסת עובד
            </Link>
          </>
        }
      />

      <div className="pilot-hero">
        <section className="pilot-main-card">
          <div className="brand-mark">HS</div>
          <div>
            <h2>מטרה לפיילוט</h2>
            <p className="lead">
              לבדוק חודש אחד האם המערכת חוסכת למנהלת זמן, מצמצמת טעויות בשיבוץ,
              ומאפשרת לעובדים להגיש זמינות בצורה פשוטה מהטלפון.
            </p>
          </div>
          <div className="actions">
            <Link className="button primary" href="/manager/schedule">
              <Wand2 size={16} />
              לפתוח שיבוץ
            </Link>
            <Link className="button" href="/availability">
              <CalendarCheck size={16} />
              הגשת עובד
            </Link>
          </div>
        </section>

        <section className="card">
          <h2>מה מציגים בדמו</h2>
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

      <div className="grid grid-4">
        <StatCard icon={Users} label="עובדים בדמו" value={staffCount} />
        <StatCard icon={CalendarCheck} label="הגישו זמינות" value={availabilitySubmitters} />
        <StatCard icon={ShieldCheck} label="אזהרות מנהלת" value={warnings.length} />
        <StatCard icon={Clock3} label="משמרות פתוחות" value={openShifts} />
      </div>

      <div className="pilot-grid">
        <section className="card">
          <h2>תהליך עבודה חודשי</h2>
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

        <section className="card">
          <h2>גרסת עובד</h2>
          <div className="feature-list">
            <div className="feature-row">
              <MonitorSmartphone size={20} />
              <span>מותאם לטלפון: כניסה, הגשת זמינות, המשמרות שלי.</span>
            </div>
            <div className="feature-row">
              <CalendarCheck size={20} />
              <span>בחירה ברורה לפי סוגי משמרות או פנוי כל היום.</span>
            </div>
            <div className="feature-row">
              <Mail size={20} />
              <span>תכנון למיילים: תזכורת הגשה, פרסום סידור ותזכורת משמרת.</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>גרסת מנהלת</h2>
          <div className="feature-list">
            <div className="feature-row">
              <Wand2 size={20} />
              <span>שיבוץ לפי יום ומשמרת, עם עובדים זמינים בלבד.</span>
            </div>
            <div className="feature-row">
              <ShieldCheck size={20} />
              <span>אזהרות על משמרות חסרות, עומסים ובעיות זמינות.</span>
            </div>
            <div className="feature-row">
              <Users size={20} />
              <span>יצירת משתמשים מראש וחובת החלפת סיסמה ראשונית.</span>
            </div>
          </div>
          <div className="card-muted" style={{ marginTop: 14 }}>
            בקשות החלפה ממתינות בדמו: <strong>{pendingSwaps}</strong>
          </div>
        </section>
      </div>
    </>
  );
}
