import { format } from "date-fns";

import { MonthGrid } from "@/components/calendar/month-grid";
import { ShiftCard } from "@/components/schedule/shift-card";
import type {
  Employee,
  ScheduledShift,
  ShiftTemplate,
  ShiftWarning
} from "@/types/scheduler";

export function ScheduleCalendar({
  days,
  schedule,
  employees,
  templates,
  warnings,
  onlyEmployeeId
}: {
  days: Date[];
  schedule: ScheduledShift[];
  employees: Employee[];
  templates: ShiftTemplate[];
  warnings: ShiftWarning[];
  onlyEmployeeId?: string;
}) {
  return (
    <MonthGrid
      days={days}
      renderDay={(day) => {
        const date = format(day, "yyyy-MM-dd");
        const shifts = schedule.filter((shift) => {
          if (shift.date !== date) return false;
          if (!onlyEmployeeId) return true;
          return shift.employeeIds.includes(onlyEmployeeId);
        });

        if (!shifts.length) {
          return <div className="metric-label">אין משמרות</div>;
        }

        return shifts.map((shift) => {
          const template = templates.find((item) => item.id === shift.shiftTemplateId);
          if (!template) return null;

          return (
            <ShiftCard
              employees={employees}
              key={shift.id}
              shift={shift}
              template={template}
              warnings={warnings.filter((warning) => warning.shiftId === shift.id)}
              compact={Boolean(onlyEmployeeId)}
            />
          );
        });
      }}
    />
  );
}
