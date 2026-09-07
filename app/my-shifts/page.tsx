"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarPlus, Repeat2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { demoOrganization, productConfig } from "@/lib/app-config";
import {
  currentEmployeeId,
  employees,
  monthDays,
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
    details: `משמרת של ${employeeName} במערכת ${productConfig.name}`,
    location: demoOrganization.locationLabel
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function MyShiftsPage() {
  const currentEmployee = employees.find((employee) => employee.id === currentEmployeeId);
  const myShifts = scheduledShifts
    .filter((shift) => shift.employeeIds.includes(currentEmployeeId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstShiftDate = myShifts[0]?.date ?? (monthDays[0] ? format(monthDays[0], "yyyy-MM-dd") : "");
  const [selectedDate, setSelectedDate] = useState(firstShiftDate);

  const shiftsForSelectedDate = useMemo(
    () => myShifts.filter((shift) => shift.date === selectedDate),
    [myShifts, selectedDate]
  );

  return (
    <>
      <PageHeader
        eyebrow="המשמרות שלי"
        title={`${currentEmployee?.fullName ?? "עובד"}, אלה המשמרות שלך`}
        description="בחרו יום מלוח התאריכים כדי לראות רק את המשמרות הרלוונטיות, בלי לגלול ברשימה ארוכה."
        actions={
          <Link href="/swap-requests" className="button">
            <Repeat2 size={16} />
            בקשת החלפה
          </Link>
        }
      />

      <section className="my-shifts-date-nav" aria-label="ניווט בין תאריכים">
        {monthDays.map((day) => {
          const date = format(day, "yyyy-MM-dd");
          const hasShift = myShifts.some((shift) => shift.date === date);
          const selected = selectedDate === date;
          return (
            <button
              type="button"
              className={`my-shifts-date-tab ${selected ? "selected" : ""} ${hasShift ? "has-shift" : ""}`}
              key={date}
              onClick={() => setSelectedDate(date)}
              aria-pressed={selected}
            >
              <span>{format(day, "EEEE", { locale: he })}</span>
              <strong>{format(day, "d.M")}</strong>
              {hasShift ? <i aria-hidden="true" /> : null}
            </button>
          );
        })}
      </section>

      <section className="card my-shifts-selected-card">
        <div className="my-shifts-selected-heading">
          <div>
            <span>{selectedDate ? format(new Date(`${selectedDate}T00:00:00`), "EEEE", { locale: he }) : ""}</span>
            <strong>{selectedDate ? format(new Date(`${selectedDate}T00:00:00`), "dd/MM/yyyy") : ""}</strong>
          </div>
          <small>{shiftsForSelectedDate.length ? `${shiftsForSelectedDate.length} משמרות` : "אין משמרת"}</small>
        </div>

        <div className="my-shifts-list">
          {shiftsForSelectedDate.length ? (
            shiftsForSelectedDate.map((shift) => {
              const template = shiftTemplates.find((item) => item.id === shift.shiftTemplateId);
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
                  <div className="my-shift-main">
                    <h2>{template.name}</h2>
                    <p>{startTime}-{endTime}</p>
                  </div>

                  <div className="actions">
                    <a className="button primary" href={calendarUrl} rel="noreferrer" target="_blank">
                      <CalendarPlus size={16} />
                      הוספה ל-Google Calendar
                    </a>
                    <Link className="button" href="/swap-requests">החלפה</Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="my-shifts-empty-day">אין לך משמרת ביום הזה.</div>
          )}
        </div>
      </section>
    </>
  );
}
