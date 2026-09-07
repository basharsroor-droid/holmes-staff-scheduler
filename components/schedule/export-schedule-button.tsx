"use client";

import type { Employee, ScheduledShift, ShiftTemplate } from "@/types/scheduler";

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function ExportScheduleButton({
  schedule,
  employees,
  templates
}: {
  schedule: ScheduledShift[];
  employees: Employee[];
  templates: ShiftTemplate[];
}) {
  function downloadExcel() {
    if (!schedule.length) return;

    const orderedDates = [...new Set(schedule.map((shift) => shift.date))].sort();
    const firstDate = toDate(orderedDates[0]);
    const lastDate = toDate(orderedDates[orderedDates.length - 1]);

    const firstWeekStart = new Date(firstDate);
    firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay());
    const lastWeekStart = new Date(lastDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay());

    const weeks: Date[][] = [];
    for (let cursor = new Date(firstWeekStart); cursor <= lastWeekStart; cursor.setDate(cursor.getDate() + 7)) {
      weeks.push(Array.from({ length: 7 }, (_, index) => {
        const day = new Date(cursor);
        day.setDate(cursor.getDate() + index);
        return day;
      }));
    }

    const templateColors = ["#e0f2fe", "#fef3c7", "#ede9fe", "#dcfce7", "#fee2e2"];
    const blocks = weeks.map((week) => {
      const header = week.map((day, index) => {
        const inRange = day >= firstDate && day <= lastDate;
        return `<th class="day-head ${inRange ? "" : "muted"}">${dayNames[index]}<br><span>${formatDate(day)}</span></th>`;
      }).join("");

      const rows = templates.map((template, templateIndex) => {
        const cells = week.map((day) => {
          const key = dateKey(day);
          const shift = schedule.find((item) => item.date === key && item.shiftTemplateId === template.id);
          if (!shift) return `<td class="shift-cell empty"></td>`;
          const employee = employees.find((item) => item.id === shift.employeeIds[0]);
          const startTime = shift.startTime ?? template.startTime;
          const endTime = shift.endTime ?? template.endTime;
          const name = employee?.fullName ?? "פתוח";
          const color = employee?.color ?? "#dc2626";
          return `<td class="shift-cell"><strong style="color:${escapeHtml(color)}">${escapeHtml(name)}</strong><small>${escapeHtml(startTime)}-${escapeHtml(endTime)}</small></td>`;
        }).join("");
        return `<tr><th class="shift-name" style="background:${templateColors[templateIndex % templateColors.length]}">${escapeHtml(template.name)}<br><small>${escapeHtml(template.startTime)}-${escapeHtml(template.endTime)}</small></th>${cells}</tr>`;
      }).join("");

      return `<table class="week-table"><thead><tr><th class="shift-name">משמרת</th>${header}</tr></thead><tbody>${rows}</tbody></table>`;
    }).join('<div class="week-gap"></div>');

    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;direction:rtl;color:#172033;margin:24px;background:#fff}
      h1{text-align:center;font-size:22px;margin:0 0 8px}.range{text-align:center;color:#667085;margin-bottom:22px}
      table{border-collapse:collapse;width:100%;table-layout:fixed}.week-table{margin-bottom:18px;page-break-inside:avoid}
      th,td{border:1px solid #b9c4d2;text-align:center;vertical-align:middle;padding:8px}
      .day-head{background:#e8edf5;font-weight:800}.day-head span{font-size:11px}.day-head.muted{color:#9aa5b3;background:#f6f7f9}
      .shift-name{width:110px;font-weight:800}.shift-name small{font-weight:600;color:#5d6778}
      .shift-cell{height:54px;background:#fbfdff}.shift-cell strong{display:block;font-size:15px}.shift-cell small{display:block;margin-top:4px;color:#4b5565;font-weight:700}
      .shift-cell.empty{background:#f5f7fa}.week-gap{height:12px}
    </style></head><body><h1>סידור עבודה</h1><div class="range">${formatDate(firstDate)} - ${formatDate(lastDate)}</div>${blocks}</body></html>`;

    const blob = new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sidur-${orderedDates[0]}-${orderedDates[orderedDates.length - 1]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="button primary" onClick={downloadExcel} disabled={!schedule.length}>
      הורדה לאקסל
    </button>
  );
}
