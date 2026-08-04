import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Repeat2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { WarningsPanel } from "@/components/schedule/warnings-panel";
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

  return (
    <>
      <PageHeader
        eyebrow="גרסת מנהלת"
        title="שולחן עבודה לסידור החודשי"
        description="מקום אחד שמראה מה דורש טיפול לפני פרסום: אזהרות, טיוטות, החלפות וסיכום עומסים בין העובדים."
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
          label="משמרות בטיוטה"
          value={scheduledShifts.filter((shift) => shift.status === "draft").length}
        />
        <StatCard icon={Repeat2} label="החלפות ממתינות" value={pendingSwaps.length} />
        <StatCard
          icon={CheckCircle2}
          label="הגישו זמינות"
          value={`${new Set(availability.map((entry) => entry.employeeId)).size}/${staffEmployees.length}`}
        />
      </div>

      <div className="manager-dashboard-grid">
        <WarningsPanel
          schedule={scheduledShifts}
          templates={shiftTemplates}
          warnings={warnings}
        />

        <section className="card">
          <h2>עומס עובדים</h2>
          <div className="warning-list">
            {fairness.slice(0, 8).map((row) => {
              const employee = employees.find((item) => item.id === row.employeeId);
              return (
                <div className="mini-row" key={row.employeeId}>
                  <strong>{employee?.fullName}</strong>
                  <span>
                    {row.totalShifts} משמרות · {row.totalWeekends} סופ״ש
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2>זרימת עבודה מומלצת</h2>
          <div className="big-action-list">
            <Link href="/manager/schedule" className="big-action">
              <CalendarDays size={22} />
              <span>
                <strong>לעבור יום-יום על הסידור</strong>
                <small>עריכה רחבה יותר, פחות צפיפות בלוח</small>
              </span>
            </Link>
            <Link href="/swap-requests" className="big-action">
              <Repeat2 size={22} />
              <span>
                <strong>לטפל בהחלפות</strong>
                <small>אישור או דחייה עם בדיקת חוקים</small>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
