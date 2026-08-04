import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarPlus, Repeat2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  currentEmployeeId,
  employees,
  scheduledShifts,
  shiftTemplates
} from "@/lib/mock-data";

function toGoogleDate(date: string, time: string) {
  const normalizedTime = time.replace(":", "");
  return `${date.replaceAll("-", "")}T${normalizedTime}00`;
}

function googleCalendarUrl({
  date,
  startTime,
  endTime,
  shiftName,
  employeeName
}: {
  date: string;
  startTime: string;
  endTime: string;
  shiftName: string;
  employeeName: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `משמרת ${shiftName}`,
    dates: `${toGoogleDate(date, startTime)}/${toGoogleDate(date, endTime)}`,
    ctz: "Asia/Jerusalem",
    details: `משמרת של ${employeeName} במערכת Holmes Staff Scheduler`,
    location: "מועדון כושר"
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function MyShiftsPage() {
  const currentEmployee = employees.find((employee) => employee.id === currentEmployeeId);
  const myShifts = scheduledShifts
    .filter((shift) => shift.employeeIds.includes(currentEmployeeId))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader
        eyebrow="המשמרות שלי"
        title={`${currentEmployee?.fullName ?? "עובד"}, אלה המשמרות שלך`}
        description="כאן מופיעות רק המשמרות האישיות שלך, בלי לראות את כל הסידור של הצוות."
        actions={
          <Link href="/swap-requests" className="button">
            <Repeat2 size={16} />
            בקשת החלפה
          </Link>
        }
      />

      <section className="card">
        <div className="my-shifts-list">
          {myShifts.length ? (
            myShifts.map((shift) => {
              const template = shiftTemplates.find(
                (item) => item.id === shift.shiftTemplateId
              );
              if (!template) return null;
              const startTime = shift.startTime ?? template.startTime;
              const endTime = shift.endTime ?? template.endTime;
              const calendarUrl = googleCalendarUrl({
                date: shift.date,
                startTime,
                endTime,
                shiftName: template.name,
                employeeName: currentEmployee?.fullName ?? ""
              });

              return (
                <article className="my-shift-card" key={shift.id}>
                  <div className="my-shift-date">
                    <strong>{format(new Date(shift.date), "EEEE", { locale: he })}</strong>
                    <span>{format(new Date(shift.date), "dd/MM/yyyy")}</span>
                  </div>

                  <div className="my-shift-main">
                    <h2>{template.name}</h2>
                    <p>
                      {startTime}-{endTime}
                    </p>
                  </div>

                  <div className="actions">
                    <a
                      className="button primary"
                      href={calendarUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <CalendarPlus size={16} />
                      הוספה ל-Google Calendar
                    </a>
                    <Link className="button" href="/swap-requests">
                      החלפה
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="metric-label">אין לך משמרות משובצות כרגע.</div>
          )}
        </div>
      </section>
    </>
  );
}
