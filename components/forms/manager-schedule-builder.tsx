"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import { ShiftTypeBadge, WarningBadge } from "@/components/schedule/badges";
import { EmployeeChip } from "@/components/schedule/employee-chip";
import { calculateFairness, validateSchedule } from "@/lib/shift-validation";
import type {
  Availability,
  Employee,
  ScheduledShift,
  ShiftTemplate
} from "@/types/scheduler";

export function ManagerScheduleBuilder({
  days,
  initialSchedule,
  employees,
  templates,
  availability
}: {
  days: Date[];
  initialSchedule: ScheduledShift[];
  employees: Employee[];
  templates: ShiftTemplate[];
  availability: Availability[];
}) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [selectedDate, setSelectedDate] = useState(format(days[0], "yyyy-MM-dd"));
  const [saved, setSaved] = useState(false);
  const warnings = useMemo(
    () => validateSchedule(schedule, employees, availability, templates),
    [availability, employees, schedule, templates]
  );
  const schedulableEmployees = employees.filter(
    (employee) => employee.role === "employee"
  );
  const fairness = useMemo(
    () => calculateFairness(schedule, schedulableEmployees, templates),
    [schedulableEmployees, schedule, templates]
  );
  const selectedDay = days.find((day) => format(day, "yyyy-MM-dd") === selectedDate) ?? days[0];
  const dayShifts = schedule.filter((shift) => shift.date === selectedDate);
  const dayWarnings = warnings.filter((warning) => warning.date === selectedDate);

  function toggleEmployee(shiftId: string, employeeId: string) {
    setSaved(false);
    setSchedule((current) =>
      current.map((shift) => {
        if (shift.id !== shiftId) return shift;
        const hasEmployee = shift.employeeIds.includes(employeeId);
        return {
          ...shift,
          employeeIds: hasEmployee
            ? shift.employeeIds.filter((id) => id !== employeeId)
            : [...shift.employeeIds, employeeId]
        };
      })
    );
  }

  function changeTemplate(shiftId: string, shiftTemplateId: string) {
    setSaved(false);
    setSchedule((current) =>
      current.map((shift) => {
        if (shift.id !== shiftId) return shift;
        const nextTemplate = templates.find((template) => template.id === shiftTemplateId);

        return {
          ...shift,
          shiftTemplateId,
          startTime: nextTemplate?.startTime,
          endTime: nextTemplate?.endTime
        };
      })
    );
  }

  function changeShiftTime(
    shiftId: string,
    field: "startTime" | "endTime",
    value: string
  ) {
    setSaved(false);
    setSchedule((current) =>
      current.map((shift) =>
        shift.id === shiftId ? { ...shift, [field]: value } : shift
      )
    );
  }

  function resetShiftTime(shift: ScheduledShift, template: ShiftTemplate) {
    setSaved(false);
    setSchedule((current) =>
      current.map((item) =>
        item.id === shift.id
          ? {
              ...item,
              startTime: template.startTime,
              endTime: template.endTime
            }
          : item
      )
    );
  }

  function publishDay() {
    setSaved(true);
    setSchedule((current) =>
      current.map((shift) =>
        shift.date === selectedDate ? { ...shift, status: "published" } : shift
      )
    );
  }

  function publishMonth() {
    setSaved(true);
    setSchedule((current) =>
      current.map((shift) => ({
        ...shift,
        status: "published"
      }))
    );
  }

  function employeesAvailableForShift(shift: ScheduledShift) {
    return schedulableEmployees.filter((employee) => {
      const entry = availability.find(
        (item) => item.employeeId === employee.id && item.date === shift.date
      );

      if (!entry || entry.status === "unavailable") return false;
      return entry.availableShiftTemplateIds?.includes(shift.shiftTemplateId);
    });
  }

  return (
    <div className="manager-workbench">
      <aside className="card day-sidebar">
        <div className="shift-title">
          <h2>ימי החודש</h2>
          <span className="badge">{days.length} ימים</span>
        </div>
        <div className="day-list">
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const count = warnings.filter((warning) => warning.date === date).length;
            return (
              <button
                className={`day-button ${date === selectedDate ? "active" : ""}`}
                key={date}
                onClick={() => setSelectedDate(date)}
              >
                <span>
                  <strong>{format(day, "d")}</strong>
                  {format(day, "EEEE", { locale: he })}
                </span>
                {count ? <span className="badge critical">{count}</span> : <span className="badge success">תקין</span>}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="card day-editor">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div>
            <h2>
              {format(selectedDay, "EEEE, d בMMMM", { locale: he })}
            </h2>
            <p className="lead">
              עורכים יום אחד בכל פעם כדי שהסידור יהיה ברור. כל משמרת מוצגת ככרטיס רחב עם עובדים ואזהרות.
            </p>
          </div>
          <div className="actions">
            <select className="select" aria-label="עונת סידור" defaultValue="summer" style={{ width: 150 }}>
              <option value="regular">רגיל</option>
              <option value="june">יוני</option>
              <option value="summer">קיץ</option>
              <option value="custom">מותאם</option>
            </select>
            <button className="button" onClick={() => setSaved(true)}>
              שמירת טיוטה
            </button>
            <button className="button primary" onClick={publishDay}>
              פרסום היום
            </button>
          </div>
        </div>

        {saved ? <p className="badge success">השינוי נשמר במצב הדגמה</p> : null}

        <div className="shift-editor-list">
          {dayShifts.map((shift) => {
            const template = templates.find((item) => item.id === shift.shiftTemplateId);
            const shiftWarnings = warnings.filter((warning) => warning.shiftId === shift.id);
            if (!template) return null;
            const startTime = shift.startTime ?? template.startTime;
            const endTime = shift.endTime ?? template.endTime;
            const hasCustomTime =
              startTime !== template.startTime || endTime !== template.endTime;

            return (
              <article className="large-shift-card" key={shift.id}>
                <div className="large-shift-header">
                  <div>
                    <div className="shift-title">
                      <h3>{template.name}</h3>
                      <ShiftTypeBadge type={template.type} />
                    </div>
                    <div className="metric-label">
                      {startTime}-{endTime} · דרושים {template.requiredEmployees} עובדים ·{" "}
                      {shift.status === "published" ? "פורסם" : "טיוטה"}
                    </div>
                  </div>
                  <select
                    className="select"
                    aria-label="סוג משמרת"
                    value={shift.shiftTemplateId}
                    onChange={(event) => changeTemplate(shift.id, event.target.value)}
                    style={{ maxWidth: 210 }}
                  >
                    {templates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="shift-time-editor">
                  <div className="field">
                    <label htmlFor={`shift-start-time-${shift.id}`}>שעת התחלה</label>
                    <input
                      id={`shift-start-time-${shift.id}`}
                      className="input"
                      type="time"
                      value={startTime}
                      onChange={(event) =>
                        changeShiftTime(shift.id, "startTime", event.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`shift-end-time-${shift.id}`}>שעת סיום</label>
                    <input
                      id={`shift-end-time-${shift.id}`}
                      className="input"
                      type="time"
                      value={endTime}
                      onChange={(event) =>
                        changeShiftTime(shift.id, "endTime", event.target.value)
                      }
                    />
                  </div>
                  <button
                    className="button"
                    onClick={() => resetShiftTime(shift, template)}
                  >
                    איפוס לשעות הרגילות
                  </button>
                  {hasCustomTime ? (
                    <span className="badge warning">שעות מותאמות</span>
                  ) : null}
                </div>

                <div className="assigned-row">
                  {shift.employeeIds.length ? (
                    shift.employeeIds.map((employeeId) => {
                      const employee = employees.find((item) => item.id === employeeId);
                      if (!employee) return null;
                      return <EmployeeChip employee={employee} key={employee.id} />;
                    })
                  ) : (
                    <span className="metric-label">אין עובדים משובצים</span>
                  )}
                </div>

                <div className="metric-label">
                  מוצגים רק עובדים שסימנו זמינות למשמרת הזו.
                </div>

                <div className="employee-picker-grid">
                  {employeesAvailableForShift(shift).map((employee) => {
                    const selected = shift.employeeIds.includes(employee.id);
                    return (
                      <button
                        className={`employee-pick ${selected ? "selected" : ""}`}
                        key={employee.id}
                        onClick={() => toggleEmployee(shift.id, employee.id)}
                      >
                        <span className="dot" style={{ background: employee.color }} />
                        <span>{employee.fullName}</span>
                      </button>
                    );
                  })}
                </div>

                {!employeesAvailableForShift(shift).length ? (
                  <div className="warning-row">
                    אין עובדים שסימנו זמינות למשמרת הזו
                  </div>
                ) : null}

                {shiftWarnings.length ? (
                  <div className="warning-list">
                    {shiftWarnings.map((warning, index) => (
                      <div className="warning-row" key={`${warning.message}-${index}`}>
                        <WarningBadge severity={warning.severity} /> {warning.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="badge success">אין בעיות במשמרת</div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="manager-side-panel">
        <section className="card">
          <div className="shift-title">
            <h2>אזהרות ליום</h2>
            <span className="badge critical">{dayWarnings.length}</span>
          </div>
          <div className="warning-list">
            {dayWarnings.length ? (
              dayWarnings.map((warning, index) => (
                <div className="warning-row" key={`${warning.shiftId}-${index}`}>
                  <WarningBadge severity={warning.severity} /> {warning.message}
                </div>
              ))
            ) : (
              <div className="metric-label">אין אזהרות ביום הזה</div>
            )}
          </div>
        </section>

        <section className="card">
          <h2>הוגנות מהירה</h2>
          <div className="compact-fairness">
            {fairness.slice(0, 8).map((row) => {
              const employee = employees.find((item) => item.id === row.employeeId);
              return (
                <div className="mini-row" key={row.employeeId}>
                  <strong>{employee?.fullName}</strong>
                  <span>{row.totalShifts} משמרות</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2>פעולות פרסום</h2>
          <div className="grid">
            <button className="button" onClick={() => setSaved(true)}>
              שמירת כל הטיוטה
            </button>
            <button className="button primary" onClick={publishMonth}>
              פרסום כל החודש
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
