import type { Employee } from "@/types/scheduler";

export function EmployeeChip({ employee }: { employee: Employee }) {
  return (
    <span className="employee-chip">
      <span className="dot" style={{ background: employee.color }} />
      {employee.fullName}
    </span>
  );
}
