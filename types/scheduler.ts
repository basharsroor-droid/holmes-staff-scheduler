export type UserRole = "employee" | "manager" | "admin";

export type SeniorityLevel = "new" | "regular" | "senior" | "shift_lead";

export type ShiftType = "opening" | "middle" | "middle_2" | "closing";

export type SeasonType = "regular" | "summer" | "custom";

export type AvailabilityStatus =
  | "available"
  | "unavailable"
  | "preferred"
  | "only_if_needed";

export type ShiftStatus = "draft" | "published";

export type SwapStatus =
  | "pending_employee"
  | "pending_manager"
  | "approved"
  | "rejected";

export type WarningSeverity = "info" | "warning" | "critical";

export interface Employee {
  id: string;
  fullName: string;
  color: string;
  role: UserRole;
  seniorityLevel: SeniorityLevel;
  canOpen: boolean;
  canClose: boolean;
  active: boolean;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: ShiftType;
  requiredEmployees: number;
  requiresSeniorEmployee: boolean;
}

export interface MonthlyShiftConfig {
  month: number;
  year: number;
  seasonType: SeasonType;
  dayTemplates: Record<string, string[]>;
}

export interface Availability {
  employeeId: string;
  date: string;
  status: AvailabilityStatus;
  availableShiftTemplateIds?: string[];
  note?: string;
}

export interface ScheduledShift {
  id: string;
  date: string;
  shiftTemplateId: string;
  employeeIds: string[];
  startTime?: string;
  endTime?: string;
  status: ShiftStatus;
}

export interface SwapRequest {
  id: string;
  requestedByEmployeeId: string;
  originalShiftId: string;
  targetEmployeeId: string;
  targetShiftId?: string;
  status: SwapStatus;
  reason: string;
  managerNote?: string;
}

export interface ShiftWarning {
  shiftId: string;
  date: string;
  message: string;
  severity: WarningSeverity;
  employeeId?: string;
}

export interface FairnessRow {
  employeeId: string;
  totalShifts: number;
  totalWeekends: number;
  openingShifts: number;
  closingShifts: number;
}
