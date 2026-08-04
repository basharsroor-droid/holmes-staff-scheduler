"use client";

import type { Employee, ScheduledShift, ShiftTemplate } from "@/types/scheduler";

export function ExportScheduleButton({
  schedule,
  employees,
  templates
}: {
  schedule: ScheduledShift[];
  employees: Employee[];
  templates: ShiftTemplate[];
}) {
  function downloadCsv() {
    const rows = [
      ["תאריך", "משמרת", "שעה", "עובד"],
      ...schedule.map((shift) => {
        const template = templates.find((item) => item.id === shift.shiftTemplateId);
        const employee = employees.find((item) => item.id === shift.employeeIds[0]);
        const startTime = shift.startTime ?? template?.startTime ?? "";
        const endTime = shift.endTime ?? template?.endTime ?? "";
        return [
          shift.date,
          template?.name ?? "",
          `${startTime}-${endTime}`,
          employee?.fullName ?? "פתוח"
        ];
      })
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sidur-july-2026.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="button primary" onClick={downloadCsv}>
      הורדה לאקסל
    </button>
  );
}
