"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, MapPin } from "lucide-react";

import { ShiftReminderButton } from "@/components/native/shift-reminder-button";

type Period = { id: string; branch_id: string; year: number; month: number; status: string; published_at: string | null };
type Branch = { id: string; name: string };
type Shift = { id: string; schedule_period_id: string; shift_date: string; name: string; start_time: string; end_time: string; manager_note: string | null; status: string };

const monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function shiftStart(shift: Shift) {
  return new Date(`${shift.shift_date}T${shift.start_time}`);
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function localIcsDateTime(date: string, time: string) {
  return `${date.replaceAll("-", "")}T${time.replaceAll(":", "").slice(0, 6)}`;
}

function createIcsEvent(shift: Shift, branchName: string) {
  const start = new Date(`${shift.shift_date}T${shift.start_time}`);
  const end = new Date(`${shift.shift_date}T${shift.end_time}`);
  const endDate = end <= start
    ? new Date(new Date(`${shift.shift_date}T12:00:00`).getTime() + 86400000).toISOString().slice(0, 10)
    : shift.shift_date;
  const description = ["ShiftPilot", shift.manager_note ? `הערת מנהל: ${shift.manager_note}` : null].filter(Boolean).join("\\n");

  return [
    "BEGIN:VEVENT",
    `UID:${shift.id}@shiftpilothq.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART;TZID=Asia/Jerusalem:${localIcsDateTime(shift.shift_date, shift.start_time)}`,
    `DTEND;TZID=Asia/Jerusalem:${localIcsDateTime(endDate, shift.end_time)}`,
    `SUMMARY:${escapeIcsText(`ShiftPilot · ${shift.name}`)}`,
    `LOCATION:${escapeIcsText(branchName)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT"
  ].join("\r\n");
}

function downloadCalendar(shifts: Shift[], branches: Branch[], periods: Period[], filename: string) {
  if (!shifts.length) return;
  const events = shifts.map((shift) => {
    const branchId = periods.find((period) => period.id === shift.schedule_period_id)?.branch_id;
    const branchName = branches.find((branch) => branch.id === branchId)?.name ?? "ShiftPilot";
    return createIcsEvent(shift, branchName);
  }).join("\r\n");

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShiftPilot//Published Shifts//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ShiftPilot",
    "X-WR-TIMEZONE:Asia/Jerusalem",
    events,
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function MyShiftsClient({ periods, branches, shifts }: { periods: Period[]; branches: Branch[]; shifts: Shift[] }) {
  const now = useMemo(() => new Date(), []);
  const initialPeriod = periods.find((period) => shifts.some((shift) => shift.schedule_period_id === period.id && shiftStart(shift) >= now))?.id ?? periods.at(-1)?.id ?? "";
  const [selectedPeriodId, setSelectedPeriodId] = useState(initialPeriod);
  const period = periods.find((item) => item.id === selectedPeriodId);
  const visibleShifts = shifts.filter((item) => item.schedule_period_id === selectedPeriodId);
  const upcoming = shifts.filter((shift) => shiftStart(shift) >= now).sort((a, b) => shiftStart(a).getTime() - shiftStart(b).getTime())[0];
  const totalHours = visibleShifts.reduce((total, shift) => {
    const start = new Date(`${shift.shift_date}T${shift.start_time}`);
    const end = new Date(`${shift.shift_date}T${shift.end_time}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    return total + (end.getTime() - start.getTime()) / 3600000;
  }, 0);

  if (!periods.length) return <section className="template-list-card"><div className="empty-template-state"><CalendarDays size={42} /><h2>עדיין אין סידור שפורסם</h2><p>כשהמנהל יפרסם את הסידור הראשון, המשמרות שלך יופיעו כאן.</p></div></section>;

  return <div className="grid my-shifts-dashboard">
    {upcoming ? <section className="template-list-card next-shift-card"><div className="template-list-heading next-shift-heading"><div><p className="eyebrow">המשמרת הקרובה</p><h2>{upcoming.name}</h2></div><span className="badge success"><CheckCircle2 size={15} /> משובצ/ת</span></div><div className="workspace-stats next-shift-stats"><article><CalendarDays /><span><strong>{new Date(`${upcoming.shift_date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</strong><small>תאריך</small></span></article><article><Clock3 /><span><strong>{upcoming.start_time.slice(0,5)}–{upcoming.end_time.slice(0,5)}</strong><small>שעות</small></span></article><article><MapPin /><span><strong>{branches.find((branch) => branch.id === periods.find((item) => item.id === upcoming.schedule_period_id)?.branch_id)?.name ?? "הסניף"}</strong><small>מיקום</small></span></article></div>{upcoming.manager_note ? <div className="submission-banner open" style={{ marginTop: 18 }}><div><strong>הערת מנהל</strong><span>{upcoming.manager_note}</span></div></div> : null}</section> : null}
    <section className="template-list-card my-schedule-card">
      <div className="template-list-heading my-schedule-toolbar"><div><p className="eyebrow">הסידור שלי</p><h2>{period ? `${monthNames[period.month - 1]} ${period.year}` : ""}</h2></div><div className="actions"><select className="input my-schedule-period-select" aria-label="בחירת חודש" value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>{periods.map((item) => <option value={item.id} key={item.id}>{monthNames[item.month - 1]} {item.year} · {branches.find((branch) => branch.id === item.branch_id)?.name ?? "סניף"}</option>)}</select><button className="button" type="button" disabled={!visibleShifts.length} onClick={() => downloadCalendar(visibleShifts, branches, periods, `shiftpilot-${period?.year ?? "schedule"}-${String(period?.month ?? "").padStart(2, "0")}.ics`)}><CalendarPlus size={16} /> הוסף את החודש ליומן</button></div></div>
      <div className="workspace-stats my-schedule-stats"><article><CalendarDays /><span><strong>{visibleShifts.length}</strong><small>משמרות בחודש</small></span></article><article><Clock3 /><span><strong>{totalHours.toFixed(totalHours % 1 ? 1 : 0)}</strong><small>שעות מתוכננות</small></span></article><article><MapPin /><span><strong>{branches.find((branch) => branch.id === period?.branch_id)?.name ?? "הסניף"}</strong><small>סניף</small></span></article></div>
      <div className="template-list my-shift-list">{visibleShifts.map((shift) => {
        const branchName = branches.find((branch) => branch.id === period?.branch_id)?.name ?? "הסניף";
        return <article className="card my-shift-card" key={shift.id}><div className="mini-row my-shift-row"><div className="template-icon"><CalendarDays /></div><span><strong>{new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</strong><small>{shift.name}</small></span><span className="badge success">{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}</span></div>{shift.manager_note ? <p className="card-muted my-shift-note">{shift.manager_note}</p> : null}<div className="actions"><button className="button secondary" type="button" onClick={() => downloadCalendar([shift], branches, periods, `shiftpilot-${shift.shift_date}-${shift.name}.ics`)}><CalendarPlus size={16} /> הוסף ליומן</button><ShiftReminderButton shiftId={shift.id} shiftName={shift.name} shiftDate={shift.shift_date} startTime={shift.start_time} branchName={branchName} /></div></article>;
      })}</div>
      {!visibleShifts.length ? <div className="empty-template-state"><CalendarDays size={38} /><p>לא שובצת למשמרות בחודש הזה.</p></div> : null}
    </section>
  </div>;
}
