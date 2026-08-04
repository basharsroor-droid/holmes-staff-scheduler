import { format } from "date-fns";
import { he } from "date-fns/locale";

import type { Employee, ScheduledShift, ShiftTemplate } from "@/types/scheduler";

export function FinalSchedule({
  days,
  schedule,
  employees,
  templates
}: {
  days: Date[];
  schedule: ScheduledShift[];
  employees: Employee[];
  templates: ShiftTemplate[];
}) {
  return (
    <div className="final-schedule">
      {days.map((day) => {
        const date = format(day, "yyyy-MM-dd");
        const dayShifts = schedule.filter((shift) => shift.date === date);

        return (
          <article className="final-day" key={date}>
            <header className="final-day-header">
              <strong>{format(day, "EEEE", { locale: he })}</strong>
              <span>{format(day, "dd/MM/yyyy")}</span>
            </header>
            <div className="final-shifts">
              {templates.map((template) => {
                const shift = dayShifts.find(
                  (item) => item.shiftTemplateId === template.id
                );
                const employee = employees.find(
                  (item) => item.id === shift?.employeeIds[0]
                );
                const startTime = shift?.startTime ?? template.startTime;
                const endTime = shift?.endTime ?? template.endTime;

                return (
                  <div className="final-shift-row" key={template.id}>
                    <div>
                      <strong>{template.name}</strong>
                      <span>
                        {startTime}-{endTime}
                      </span>
                    </div>
                    <b
                      className={employee ? "" : "open"}
                      style={employee ? { color: employee.color } : undefined}
                    >
                      {employee?.fullName ?? "פתוח"}
                    </b>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
