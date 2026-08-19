import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  LockKeyhole,
  Mail,
  Repeat2,
  Users,
  Wand2
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { WarningsPanel } from "@/components/schedule/warnings-panel";
import { demoOrganization } from "@/lib/app-config";
import {
  availability,
  employees,
  scheduledShifts,
  shiftTemplates,
  swapRequests
} from "@/lib/mock-data";
import { calculateFairness, validateSchedule } from "@/lib/shift-validation";

export default function ManagerWorkspacePage() {
  const warnings = validateSchedule(
    scheduledShifts,
    employees,
    availability,
    shiftTemplates
  );
  const staffEmployees = employees.filter((employee) => employee.role === "employee");
  const fairness = calculateFairness(scheduledShifts, staffEmployees, shiftTemplates);
  const criticalWarnings = warnings.filter((warning) => warning.severity === "critical");
  const pendingSwaps = swapRequests.filter((request) =>
    ["pending_employee", "pending_manager"].includes(request.status)
  );
  const submittedEmployeeIds = new Set(availability.map((entry) => entry.employeeId));
  const missingSubmitters = staffEmployees.filter(
    (employee) => !submittedEmployeeIds.has(employee.id)
  );
  const openShifts = scheduledShifts.filter((shift) => !shift.employeeIds.length);
  const draftShifts = scheduledShifts.filter((shift) => shift.status === "draft");
  const publishedShifts = scheduledShifts.filter((shift) => shift.status === "published");
  const completionPercent = Math.round(
    ((scheduledShifts.length - openShifts.length) / scheduledShifts.length) * 100
  );
  const pilotReadiness = [
    {
      label: "עובדים קיימים",
      done: staffEmployees.length >= 8,
      detail: `${staffEmployees.length} עובדים פעילים`
    },
    {
      label: "זמינות נאספה",
      done: missingSubmitters.length === 0,
      detail: missingSubmitters.length
        ? `${missingSubmitters.length} עובדים חסרים`
        : "כל העובדים הגישו"
    },
    {
      label: "סידור כמעט מלא",
      done: completionPercent >= 90,
      detail: `${completionPercent}% משובץ`
    },
    {
      label: "אפשר להציג לעובדים",
      done: publishedShifts.length > 0,
      detail: `${publishedShifts.length} משמרות פורסמו`
    }
  ];
  const firstOpenShifts = openShifts.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="גרסת מנהל/ת"
        title="מרכז הניהול"
        description="כל מה שדורש את תשומת הלב שלכם, במסך אחד. מצב הסידור, זמינות העובדים, משמרות פתוחות, בקשות החלפה והפעולות שצריך להשלים לפני הפרסום."
        actions={
          <>
            <Link className="button primary" href="/manager/schedule">
              פתיחת שולחן שיבוץ
            </Link>
            <Link className="button" href="/schedule">
              צפייה בלוח מלא
            </Link>
          </>
        }
      />

      <div className="grid grid-4">
        <StatCard icon={AlertTriangle} label="אזהרות קריטיות" value={criticalWarnings.length} />
        <StatCard
          icon={CalendarDays}
          label="משמרות פתוחות"
          value={openShifts.length}
        />
        <StatCard icon={Repeat2} label="החלפות ממתינות" value={pendingSwaps.length} />
        <StatCard
          icon={CheckCircle2}
          label="התקדמות שיבוץ"
          value={`${completionPercent}%`}
        />
      </div>

      <section className="card manager-command-card">
        <div>
          <div className="shift-title">
            <span className={completionPercent >= 90 ? "badge success" : "badge warning"}>
              {completionPercent >= 90 ? "מוכן כמעט לפרסום" : "דורש טיפול"}
            </span>
            <span className="metric-label">{demoOrganization.scheduleMonthLabel}</span>
          </div>
          <h2>מצב הסידור החודשי</h2>
          <p className="lead">
            {openShifts.length
              ? `יש ${openShifts.length} משמרות פתוחות שצריך לשבץ לפני הצגת הסידור הסופי.`
              : "כל המשמרות משובצות. אפשר לעבור לאישור ופרסום."}
          </p>
        </div>
        <div className="progress-block">
          <div className="progress-track">
            <span style={{ width: `${completionPercent}%` }} />
          </div>
          <div className="metric-label">{completionPercent}% מהמשמרות משובצות</div>
        </div>
        <div className="actions">
          <Link className="button primary" href="/manager/schedule">
            <Wand2 size={16} />
            המשך שיבוץ
          </Link>
          <Link className="button" href="/schedule">
            <FileSpreadsheet size={16} />
            לוח סופי ואקסל
          </Link>
        </div>
      </section>

      <div className="manager-focus-grid">
        <section className="card">
          <h2>פעולות להיום</h2>
          <div className="big-action-list">
            <Link href="/manager/schedule" className="big-action priority">
              <Wand2 size={22} />
              <span>
                <strong>לשבץ משמרות פתוחות</strong>
                <small>{openShifts.length} משמרות עדיין בלי עובד</small>
              </span>
            </Link>
            <Link href="/swap-requests" className="big-action">
              <Repeat2 size={22} />
              <span>
                <strong>לטפל בבקשות החלפה</strong>
                <small>{pendingSwaps.length} בקשות מחכות לאישור</small>
              </span>
            </Link>
            <Link href="/admin/employees" className="big-action">
              <Users size={22} />
              <span>
                <strong>ניהול משתמשים</strong>
                <small>יצירת עובד וסיסמה ראשונית</small>
              </span>
            </Link>
          </div>
        </section>

        <section className="card">
          <h2>משמרות פתוחות דחופות</h2>
          <div className="warning-list">
            {firstOpenShifts.length ? (
              firstOpenShifts.map((shift) => {
                const template = shiftTemplates.find(
                  (item) => item.id === shift.shiftTemplateId
                );
                return (
                  <div className="mini-row alert-row" key={shift.id}>
                    <div>
                      <strong>{shift.date}</strong>
                      <span>{template?.name}</span>
                    </div>
                    <span className="badge critical">חסר עובד</span>
                  </div>
                );
              })
            ) : (
              <div className="mini-row">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>אין משמרות פתוחות כרגע</span>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2>מוכנות לפיילוט</h2>
          <div className="warning-list">
            {pilotReadiness.map((item) => (
              <div className="mini-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <span className={item.done ? "badge success" : "badge warning"}>
                  {item.done ? "תקין" : "לטיפול"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="manager-dashboard-grid">
        <section className="card">
          <h2>עומס עובדים</h2>
          <div className="warning-list">
            {fairness
              .slice()
              .sort((a, b) => b.totalShifts - a.totalShifts)
              .slice(0, 8)
              .map((row) => {
              const employee = employees.find((item) => item.id === row.employeeId);
              return (
                <div className="mini-row" key={row.employeeId}>
                  <div>
                    <strong>{employee?.fullName}</strong>
                    <span>
                      {row.openingShifts} פתיחות · {row.closingShifts} סגירות
                    </span>
                  </div>
                  <span className="badge">{row.totalShifts} משמרות</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2>עובדים שלא הגישו</h2>
          <div className="warning-list">
            {missingSubmitters.length ? (
              missingSubmitters.map((employee) => (
                <div className="mini-row" key={employee.id}>
                  <div>
                    <strong>{employee.fullName}</strong>
                    <span>אין הגשת זמינות לחודש</span>
                  </div>
                  <span className="badge warning">תזכורת</span>
                </div>
              ))
            ) : (
              <div className="mini-row">
                <Mail size={18} color="var(--green)" />
                <span>כל העובדים הגישו זמינות בדמו</span>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2>בקרות ניהול</h2>
          <div className="warning-list">
            <div className="mini-row">
              <div>
                <strong>חלון הגשה</strong>
                <span>22-28 לחודש או פתיחה ידנית</span>
              </div>
              <LockKeyhole size={18} color="var(--primary)" />
            </div>
            <div className="mini-row">
              <div>
                <strong>טיוטות</strong>
                <span>{draftShifts.length} משמרות עדיין בטיוטה</span>
              </div>
              <Clock3 size={18} color="var(--primary)" />
            </div>
            <div className="mini-row">
              <div>
                <strong>אזהרות כלליות</strong>
                <span>{warnings.length} בדיקות חוקים פעילות</span>
              </div>
              <AlertTriangle size={18} color="var(--amber)" />
            </div>
          </div>
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <WarningsPanel
          schedule={scheduledShifts}
          templates={shiftTemplates}
          warnings={warnings.slice(0, 10)}
        />
      </div>
    </>
  );
}
