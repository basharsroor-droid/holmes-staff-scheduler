import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";

import type {
  Availability,
  Employee,
  MonthlyShiftConfig,
  ScheduledShift,
  ShiftTemplate,
  SwapRequest
} from "@/types/scheduler";

export const currentEmployeeId = "emp-demo-worker";
export const managerEmployeeId = "emp-demo-manager";

export const demoMonth = {
  month: 8,
  year: 2026
};

export const employees: Employee[] = [
  {
    id: "emp-demo-worker",
    fullName: "עובד דמו",
    color: "#0ea5e9",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-1",
    fullName: "עובדת 1",
    color: "#8a6f12",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-2",
    fullName: "עובד 2",
    color: "#ec4899",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-3",
    fullName: "עובדת 3",
    color: "#a78bfa",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-4",
    fullName: "עובד 4",
    color: "#dc2626",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-5",
    fullName: "עובדת 5",
    color: "#b08900",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-6",
    fullName: "עובד 6",
    color: "#1d4ed8",
    role: "employee",
    seniorityLevel: "senior",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-7",
    fullName: "עובדת 7",
    color: "#ef4444",
    role: "employee",
    seniorityLevel: "senior",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: managerEmployeeId,
    fullName: "מנהלת דמו",
    color: "#059669",
    role: "manager",
    seniorityLevel: "shift_lead",
    canOpen: true,
    canClose: true,
    active: true
  }
];

export const demoUsers = employees.filter((employee) =>
  [currentEmployeeId, managerEmployeeId].includes(employee.id)
);

export const shiftTemplates: ShiftTemplate[] = [
  {
    id: "opening",
    name: "פתיחה",
    startTime: "05:45",
    endTime: "12:00",
    type: "opening",
    requiredEmployees: 1,
    requiresSeniorEmployee: false
  },
  {
    id: "middle",
    name: "אמצע 1",
    startTime: "10:00",
    endTime: "15:00",
    type: "middle",
    requiredEmployees: 1,
    requiresSeniorEmployee: false
  },
  {
    id: "middle-2",
    name: "אמצע 2",
    startTime: "15:00",
    endTime: "20:00",
    type: "middle_2",
    requiredEmployees: 1,
    requiresSeniorEmployee: false
  },
  {
    id: "closing",
    name: "סגירה",
    startTime: "15:00",
    endTime: "22:30",
    type: "closing",
    requiredEmployees: 1,
    requiresSeniorEmployee: false
  }
];

const monthStart = startOfMonth(new Date(demoMonth.year, demoMonth.month - 1));
const monthEnd = endOfMonth(monthStart);
export const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
const allTemplateIds = ["opening", "middle", "middle-2", "closing"];

export const monthlyShiftConfig: MonthlyShiftConfig = {
  month: demoMonth.month,
  year: demoMonth.year,
  seasonType: "summer",
  dayTemplates: Object.fromEntries(
    monthDays.map((day) => [format(day, "yyyy-MM-dd"), allTemplateIds])
  )
};

const demoAugustAssignments: Record<string, Partial<Record<string, string>>> = {
  "2026-08-01": { opening: "emp-6", middle: "emp-5", closing: "emp-4" },
  "2026-08-02": { closing: "emp-3" },
  "2026-08-03": { opening: "emp-4", middle: "emp-demo-worker", closing: "emp-2" },
  "2026-08-04": { opening: "emp-demo-worker", middle: "emp-3", closing: "emp-4" },
  "2026-08-05": { opening: "emp-5", middle: "emp-4", closing: "emp-1" },
  "2026-08-06": { opening: "emp-demo-worker", middle: "emp-1", closing: "emp-2" },
  "2026-08-07": { opening: "emp-1", middle: "emp-5", closing: "emp-4" },
  "2026-08-08": { opening: "emp-demo-worker", middle: "emp-5", closing: "emp-6" },
  "2026-08-09": { closing: "emp-4" },
  "2026-08-10": { opening: "emp-demo-worker", middle: "emp-3", closing: "emp-2" },
  "2026-08-11": { opening: "emp-demo-worker", middle: "emp-5", closing: "emp-4" },
  "2026-08-12": { opening: "emp-5", middle: "emp-4", closing: "emp-demo-worker" },
  "2026-08-13": { opening: "emp-3", middle: "emp-demo-worker", closing: "emp-4" },
  "2026-08-14": { opening: "emp-demo-worker", middle: "emp-4", closing: "emp-6" },
  "2026-08-15": { opening: "emp-2", middle: "emp-demo-worker", closing: "emp-6" },
  "2026-08-16": { closing: "emp-3" },
  "2026-08-17": { opening: "emp-5", middle: "emp-4", closing: "emp-demo-worker" },
  "2026-08-18": { opening: "emp-5", middle: "emp-4", closing: "emp-6" },
  "2026-08-19": { opening: "emp-5", middle: "emp-4", closing: "emp-3" },
  "2026-08-20": { opening: "emp-5", middle: "emp-4", closing: "emp-2" },
  "2026-08-21": { opening: "emp-4", closing: "emp-6" },
  "2026-08-22": { opening: "emp-4", middle: "emp-7", closing: "emp-5" },
  "2026-08-23": { closing: "emp-7" },
  "2026-08-24": { opening: "emp-5", middle: "emp-6", closing: "emp-7" },
  "2026-08-25": { opening: "emp-demo-worker", middle: "emp-6", closing: "emp-7" },
  "2026-08-26": { opening: "emp-4", middle: "emp-demo-worker", closing: "emp-7" },
  "2026-08-27": { opening: "emp-1", middle: "emp-4", closing: "emp-demo-worker" },
  "2026-08-28": { opening: "emp-demo-worker", middle: "emp-7", closing: "emp-4" },
  "2026-08-29": { opening: "emp-demo-worker", middle: "emp-6", closing: "emp-7" },
  "2026-08-30": { closing: "emp-1" },
  "2026-08-31": { opening: "emp-7", middle: "emp-6", closing: "emp-1" }
};

function assignmentFor(date: string, templateId: string) {
  const normalizedTemplateId = templateId === "middle-2" ? "middle_2" : templateId;
  const employeeId = demoAugustAssignments[date]?.[normalizedTemplateId];
  return employeeId ? [employeeId] : [];
}

export const scheduledShifts: ScheduledShift[] = monthDays.flatMap((day) => {
  const date = format(day, "yyyy-MM-dd");

  return allTemplateIds.map((templateId) => {
    const dayOfWeek = day.getDay();
    const customTime =
      dayOfWeek === 5 && templateId === "middle"
        ? { startTime: "09:00", endTime: "15:00" }
        : dayOfWeek === 6 && templateId === "opening"
          ? { startTime: "07:45", endTime: "13:00" }
          : dayOfWeek === 6 && templateId === "middle"
            ? { startTime: "09:00", endTime: "16:00" }
            : dayOfWeek === 5 && templateId === "closing"
              ? { startTime: "12:00", endTime: "18:30" }
              : dayOfWeek === 6 && templateId === "closing"
                ? { startTime: "13:00", endTime: "18:30" }
                : {};

    return {
      id: `shift-${date}-${templateId}`,
      date,
      shiftTemplateId: templateId,
      employeeIds: assignmentFor(date, templateId),
      status: "published" as const,
      ...customTime
    };
  });
});

export const availability: Availability[] = monthDays.flatMap((day, dayIndex) => {
  const date = format(day, "yyyy-MM-dd");

  return employees
    .filter((employee) => employee.role === "employee")
    .map((employee, employeeIndex) => {
      const assignedTemplateIds = allTemplateIds.filter((templateId) =>
        assignmentFor(date, templateId).includes(employee.id)
      );
      const fallbackTemplates =
        employeeIndex % 3 === 0
          ? ["opening", "middle"]
          : employeeIndex % 3 === 1
            ? ["middle", "middle-2"]
            : ["middle-2", "closing"];

      return {
        employeeId: employee.id,
        date,
        status:
          (dayIndex + employeeIndex) % 9 === 0
            ? ("only_if_needed" as const)
            : ("available" as const),
        availableShiftTemplateIds: assignedTemplateIds.length
          ? assignedTemplateIds
          : fallbackTemplates,
        note: (dayIndex + employeeIndex) % 9 === 0 ? "אפשרי רק אם חייבים" : undefined
      };
    });
});

export const swapRequests: SwapRequest[] = [
  {
    id: "swap-1",
    requestedByEmployeeId: "emp-demo-worker",
    originalShiftId: "shift-2026-08-04-opening",
    targetEmployeeId: "emp-2",
    status: "pending_manager",
    reason: "מבקש החלפה למשמרת פתיחה",
    managerNote: ""
  },
  {
    id: "swap-2",
    requestedByEmployeeId: "emp-1",
    originalShiftId: "shift-2026-08-27-opening",
    targetEmployeeId: "emp-6",
    status: "pending_employee",
    reason: "בקשת החלפה חד פעמית"
  }
];

export const defaultNewShift: ScheduledShift = {
  id: `shift-${format(monthStart, "yyyy-MM-dd")}-custom`,
  date: format(monthStart, "yyyy-MM-dd"),
  shiftTemplateId: "opening",
  employeeIds: [],
  status: "draft"
};
