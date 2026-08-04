import Link from "next/link";
import { AlertTriangle, CalendarCheck, Clock3, Repeat2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmployeeChip } from "@/components/schedule/employee-chip";
import {
  availability,
  currentEmployeeId,
  employees,
  scheduledShifts,
  shiftTemplates,
  swapRequests
} from "@/lib/mock-data";
import { availabilityLabels } from "@/lib/scheduler-labels";

export default function EmployeeWorkspacePage() {
  const currentEmployee = employees.find((employee) => employee.id === currentEmployeeId);
  const myShifts = scheduledShifts.filter((shift) =>
    shift.employeeIds.includes(currentEmployeeId)
  );
  const myUnavailableDays = availability.filter(
    (entry) => entry.employeeId === currentEmployeeId && entry.status === "unavailable"
  ).length;
  const mySwaps = swapRequests.filter(
    (request) => request.requestedByEmployeeId === currentEmployeeId
  );
  const nextShifts = myShifts.slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="גרסת עובד"
        title={`שלום ${currentEmployee?.fullName ?? "עובד"}`}
        description="שולחן עבודה פשוט: הגשת זמינות, צפייה במשמרות האישיות ובקשות החלפה בלי מסכי ניהול מיותרים."
        actions={
          <>
            <Link className="button primary" href="/availability">
              הגשת זמינות
            </Link>
            <Link className="button" href="/my-shifts">
              המשמרות שלי
            </Link>
          </>
        }
      />

      <div className="grid grid-4">
        <StatCard icon={CalendarCheck} label="ימי זמינות" value={31 - myUnavailableDays} />
        <StatCard icon={AlertTriangle} label="ימים לא זמינים" value={myUnavailableDays} />
        <StatCard icon={Clock3} label="משמרות שלי" value={myShifts.length} />
        <StatCard icon={Repeat2} label="החלפות שלי" value={mySwaps.length} />
      </div>

      <div className="employee-workspace">
        <section className="card">
          <h2>הפעולה הבאה</h2>
          <div className="big-action-list">
            <Link href="/availability" className="big-action">
              <CalendarCheck size={22} />
              <span>
                <strong>להגיש זמינות לחודש</strong>
                <small>בחירה מהירה לפי ימים עם הערות</small>
              </span>
            </Link>
            <Link href="/swap-requests" className="big-action">
              <Repeat2 size={22} />
              <span>
                <strong>לבקש החלפה</strong>
                <small>בחירת משמרת, עובד יעד וסיבה</small>
              </span>
            </Link>
            <Link href="/my-shifts" className="big-action">
              <Clock3 size={22} />
              <span>
                <strong>לראות את המשמרות שלי</strong>
                <small>רשימה אישית עם הוספה ליומן Google</small>
              </span>
            </Link>
          </div>
        </section>

        <section className="card">
          <h2>המשמרות הקרובות שלי</h2>
          <div className="warning-list">
            {nextShifts.map((shift) => {
              const template = shiftTemplates.find(
                (item) => item.id === shift.shiftTemplateId
              );
              const partners = shift.employeeIds
                .filter((employeeId) => employeeId !== currentEmployeeId)
                .map((employeeId) => employees.find((employee) => employee.id === employeeId))
                .filter(Boolean);

              return (
                <article className="warning-row" key={shift.id}>
                  <div className="shift-title">
                    <span>{shift.date}</span>
                    <span className="badge">{template?.startTime}-{template?.endTime}</span>
                  </div>
                  <div className="metric-label">{template?.name}</div>
                  <div className="employee-list" style={{ marginTop: 8 }}>
                    {partners.map((employee) =>
                      employee ? <EmployeeChip employee={employee} key={employee.id} /> : null
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2>סטטוס זמינות לדוגמה</h2>
          <div className="availability-mini-list">
            {availability
              .filter((entry) => entry.employeeId === currentEmployeeId)
              .slice(0, 8)
              .map((entry) => (
                <div className="mini-row" key={entry.date}>
                  <span>{entry.date}</span>
                  <span className="badge">{availabilityLabels[entry.status]}</span>
                </div>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}
