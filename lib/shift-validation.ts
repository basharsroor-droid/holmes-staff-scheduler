import { getDay, parseISO } from "date-fns";

import type {
  Availability,
  Employee,
  FairnessRow,
  ScheduledShift,
  ShiftTemplate,
  ShiftWarning
} from "@/types/scheduler";

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  const normalizedAEnd = aEnd <= aStart ? aEnd + 24 * 60 : aEnd;
  const normalizedBEnd = bEnd <= bStart ? bEnd + 24 * 60 : bEnd;

  return aStart < normalizedBEnd && bStart < normalizedAEnd;
}

function isSenior(employee: Employee) {
  return employee.seniorityLevel === "senior" || employee.seniorityLevel === "shift_lead";
}

function shiftStart(shift: ScheduledShift, template: ShiftTemplate) {
  return shift.startTime ?? template.startTime;
}

function shiftEnd(shift: ScheduledShift, template: ShiftTemplate) {
  return shift.endTime ?? template.endTime;
}

export function validateShift(
  shift: ScheduledShift,
  employees: Employee[],
  availability: Availability[],
  shiftTemplate: ShiftTemplate,
  schedule: ScheduledShift[] = [],
  templates: ShiftTemplate[] = []
): ShiftWarning[] {
  const assignedEmployees = shift.employeeIds
    .map((employeeId) => employees.find((employee) => employee.id === employeeId))
    .filter(Boolean) as Employee[];

  const warnings: ShiftWarning[] = [];

  if (assignedEmployees.length === 0) {
    warnings.push({
      shiftId: shift.id,
      date: shift.date,
      message: "אין עובד משובץ במשמרת",
      severity: "critical"
    });
  } else if (assignedEmployees.length < shiftTemplate.requiredEmployees) {
    warnings.push({
      shiftId: shift.id,
      date: shift.date,
      message: "חסר כוח אדם במשמרת",
      severity: "critical"
    });
  }

  const newEmployees = assignedEmployees.filter(
    (employee) => employee.seniorityLevel === "new"
  );
  if (newEmployees.length >= 2) {
    warnings.push({
      shiftId: shift.id,
      date: shift.date,
      message: "שני עובדים חדשים שובצו יחד",
      severity: "critical"
    });
  }

  if (shiftTemplate.requiresSeniorEmployee && !assignedEmployees.some(isSenior)) {
    warnings.push({
      shiftId: shift.id,
      date: shift.date,
      message: "חסר עובד ותיק במשמרת עמוסה",
      severity: "critical"
    });
  }

  assignedEmployees.forEach((employee) => {
    const dayAvailability = availability.find(
      (entry) => entry.employeeId === employee.id && entry.date === shift.date
    );

    if (dayAvailability?.status === "unavailable") {
      warnings.push({
        shiftId: shift.id,
        date: shift.date,
        message: `${employee.fullName} שובץ למרות שסימן לא זמין`,
        severity: "critical",
        employeeId: employee.id
      });
    }

    if (
      dayAvailability?.availableShiftTemplateIds?.length &&
      !dayAvailability.availableShiftTemplateIds.includes(shift.shiftTemplateId)
    ) {
      warnings.push({
        shiftId: shift.id,
        date: shift.date,
        message: `${employee.fullName} לא סימן זמינות למשמרת הזו`,
        severity: "warning",
        employeeId: employee.id
      });
    }

    if (shiftTemplate.type === "opening" && !employee.canOpen) {
      warnings.push({
        shiftId: shift.id,
        date: shift.date,
        message: `${employee.fullName} לא מורשה לפתיחה`,
        severity: "warning",
        employeeId: employee.id
      });
    }

    if (shiftTemplate.type === "closing" && !employee.canClose) {
      warnings.push({
        shiftId: shift.id,
        date: shift.date,
        message: `${employee.fullName} לא מורשה לסגירה`,
        severity: "warning",
        employeeId: employee.id
      });
    }
  });

  if ([5, 6].includes(getDay(parseISO(shift.date))) && shift.employeeIds.length < shiftTemplate.requiredEmployees) {
    warnings.push({
      shiftId: shift.id,
      date: shift.date,
      message: "חוסר כוח אדם בשישי/שבת בקיץ",
      severity: "critical"
    });
  }

  const currentStart = toMinutes(shiftStart(shift, shiftTemplate));
  const currentEnd = toMinutes(shiftEnd(shift, shiftTemplate));

  schedule
    .filter((otherShift) => otherShift.id !== shift.id && otherShift.date === shift.date)
    .forEach((otherShift) => {
      const otherTemplate = templates.find(
        (template) => template.id === otherShift.shiftTemplateId
      );
      if (!otherTemplate) return;

      const hasSharedEmployee = shift.employeeIds.find((employeeId) =>
        otherShift.employeeIds.includes(employeeId)
      );
      if (!hasSharedEmployee) return;

      if (
        rangesOverlap(
          currentStart,
          currentEnd,
          toMinutes(shiftStart(otherShift, otherTemplate)),
          toMinutes(shiftEnd(otherShift, otherTemplate))
        )
      ) {
        const employee = employees.find((item) => item.id === hasSharedEmployee);
        warnings.push({
          shiftId: shift.id,
          date: shift.date,
          message: `${employee?.fullName ?? "עובד"} שובץ במשמרות חופפות`,
          severity: "critical",
          employeeId: hasSharedEmployee
        });
      }
    });

  return warnings;
}

export function validateSchedule(
  schedule: ScheduledShift[],
  employees: Employee[],
  availability: Availability[],
  templates: ShiftTemplate[]
) {
  return schedule.flatMap((shift) => {
    const template = templates.find((item) => item.id === shift.shiftTemplateId);
    if (!template) {
      return [
        {
          shiftId: shift.id,
          date: shift.date,
          message: "תבנית משמרת חסרה",
          severity: "critical" as const
        }
      ];
    }

    return validateShift(shift, employees, availability, template, schedule, templates);
  });
}

export function calculateFairness(
  schedule: ScheduledShift[],
  employees: Employee[],
  templates: ShiftTemplate[]
): FairnessRow[] {
  return employees.map((employee) => {
    const employeeShifts = schedule.filter((shift) =>
      shift.employeeIds.includes(employee.id)
    );

    return {
      employeeId: employee.id,
      totalShifts: employeeShifts.length,
      totalWeekends: employeeShifts.filter((shift) =>
        [5, 6].includes(getDay(parseISO(shift.date)))
      ).length,
      openingShifts: employeeShifts.filter((shift) => {
        const template = templates.find((item) => item.id === shift.shiftTemplateId);
        return template?.type === "opening";
      }).length,
      closingShifts: employeeShifts.filter((shift) => {
        const template = templates.find((item) => item.id === shift.shiftTemplateId);
        return template?.type === "closing";
      }).length
    };
  });
}
