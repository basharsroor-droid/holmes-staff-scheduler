import type {
  Employee,
  ScheduledShift,
  ShiftTemplate,
  ShiftWarning
} from "@/types/scheduler";
import { ShiftTypeBadge, WarningBadge } from "@/components/schedule/badges";
import { EmployeeChip } from "@/components/schedule/employee-chip";

export function ShiftCard({
  shift,
  template,
  employees,
  warnings = [],
  compact = false
}: {
  shift: ScheduledShift;
  template: ShiftTemplate;
  employees: Employee[];
  warnings?: ShiftWarning[];
  compact?: boolean;
}) {
  const assignedEmployees = shift.employeeIds
    .map((employeeId) => employees.find((employee) => employee.id === employeeId))
    .filter(Boolean) as Employee[];
  const highestSeverity = warnings.some((warning) => warning.severity === "critical")
    ? "critical"
    : warnings.length
      ? "warning"
      : "";

  return (
    <article className={`shift-block ${highestSeverity}`}>
      <div className="shift-title">
        <span>{template.name}</span>
        <ShiftTypeBadge type={template.type} />
      </div>
      <div className="metric-label">
        {template.startTime}-{template.endTime} · {shift.status === "published" ? "פורסם" : "טיוטה"}
      </div>
      <div className="employee-list">
        {assignedEmployees.length ? (
          assignedEmployees.map((employee) => (
            <EmployeeChip employee={employee} key={employee.id} />
          ))
        ) : (
          <span className="metric-label">אין עובדים משובצים</span>
        )}
      </div>
      {!compact && warnings.length ? (
        <div className="warning-list">
          {warnings.slice(0, 2).map((warning, index) => (
            <div className="warning-row" key={`${warning.message}-${index}`}>
              <WarningBadge severity={warning.severity} /> {warning.message}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
