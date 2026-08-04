import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";

import type {
  Availability,
  Employee,
  MonthlyShiftConfig,
  ScheduledShift,
  ShiftTemplate,
  SwapRequest
} from "@/types/scheduler";

export const currentEmployeeId = "emp-bashar";
export const managerEmployeeId = "emp-valeria";

export const demoMonth = {
  month: 7,
  year: 2026
};

export const employees: Employee[] = [
  {
    id: "emp-bashar",
    fullName: "בשאר",
    color: "#0ea5e9",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-lama",
    fullName: "למא",
    color: "#8a6f12",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-lior",
    fullName: "ליאור",
    color: "#ec4899",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-nagia",
    fullName: "נגיה",
    color: "#a78bfa",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-gili",
    fullName: "גילי",
    color: "#dc2626",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-ariel",
    fullName: "אריאל",
    color: "#b08900",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-eden",
    fullName: "עדן",
    color: "#7c3aed",
    role: "employee",
    seniorityLevel: "regular",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-maayan",
    fullName: "מעיין",
    color: "#1d4ed8",
    role: "employee",
    seniorityLevel: "senior",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: "emp-keren",
    fullName: "קרן",
    color: "#ef4444",
    role: "employee",
    seniorityLevel: "senior",
    canOpen: true,
    canClose: true,
    active: true
  },
  {
    id: managerEmployeeId,
    fullName: "ולריה",
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
    startTime: "17:00",
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

const realJulyAssignments: Record<string, Partial<Record<string, string>>> = {
  "2026-07-01": { opening: "emp-maayan" },
  "2026-07-02": { opening: "emp-ariel", closing: "emp-keren" },
  "2026-07-03": {
    opening: "emp-bashar",
    middle: "emp-gili",
    closing: "emp-keren"
  },
  "2026-07-04": {
    opening: "emp-bashar",
    middle: "emp-eden",
    closing: "emp-maayan"
  },
  "2026-07-05": { closing: "emp-maayan" },
  "2026-07-06": {
    opening: "emp-nagia",
    middle: "emp-lama",
    middle_2: "emp-gili",
    closing: "emp-keren"
  },
  "2026-07-07": {
    opening: "emp-ariel",
    middle: "emp-lama",
    middle_2: "emp-gili",
    closing: "emp-keren"
  },
  "2026-07-08": { opening: "emp-bashar", closing: "emp-gili" },
  "2026-07-09": {
    opening: "emp-nagia",
    middle: "emp-maayan",
    middle_2: "emp-gili",
    closing: "emp-keren"
  },
  "2026-07-10": {
    opening: "emp-ariel",
    middle: "emp-nagia",
    closing: "emp-gili"
  },
  "2026-07-11": {
    opening: "emp-bashar",
    middle: "emp-maayan",
    closing: "emp-gili"
  },
  "2026-07-12": { closing: "emp-gili" },
  "2026-07-13": {
    opening: "emp-bashar",
    middle: "emp-gili",
    middle_2: "emp-nagia",
    closing: "emp-keren"
  },
  "2026-07-14": { opening: "emp-maayan", closing: "emp-keren" },
  "2026-07-15": { opening: "emp-maayan" },
  "2026-07-16": {
    opening: "emp-ariel",
    middle: "emp-lama",
    middle_2: "emp-keren",
    closing: "emp-maayan"
  },
  "2026-07-17": {
    opening: "emp-bashar",
    middle: "emp-nagia",
    closing: "emp-keren"
  },
  "2026-07-18": {
    opening: "emp-lior",
    middle: "emp-gili",
    closing: "emp-keren"
  }
};

function assignmentFor(date: string, templateId: string) {
  const normalizedTemplateId = templateId === "middle-2" ? "middle_2" : templateId;
  const employeeId = realJulyAssignments[date]?.[normalizedTemplateId];
  return employeeId ? [employeeId] : [];
}

export const scheduledShifts: ScheduledShift[] = monthDays.flatMap((day) => {
  const date = format(day, "yyyy-MM-dd");

  return allTemplateIds.map((templateId) => {
    const customTime =
      date === "2026-07-03" && templateId === "closing"
        ? { startTime: "16:00", endTime: "22:30" }
        : date === "2026-07-04" && templateId === "opening"
          ? { startTime: "05:45", endTime: "12:30" }
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
    requestedByEmployeeId: "emp-bashar",
    originalShiftId: "shift-2026-07-03-opening",
    targetEmployeeId: "emp-lior",
    status: "pending_manager",
    reason: "מבקש החלפה למשמרת פתיחה",
    managerNote: ""
  },
  {
    id: "swap-2",
    requestedByEmployeeId: "emp-lama",
    originalShiftId: "shift-2026-07-16-middle",
    targetEmployeeId: "emp-maayan",
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
