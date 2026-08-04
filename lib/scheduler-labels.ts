import type {
  AvailabilityStatus,
  SeniorityLevel,
  ShiftStatus,
  ShiftType,
  SwapStatus
} from "@/types/scheduler";

export const shiftTypeLabels: Record<ShiftType, string> = {
  opening: "פתיחה",
  middle: "אמצע",
  middle_2: "אמצע 2",
  closing: "סגירה"
};

export const seniorityLabels: Record<SeniorityLevel, string> = {
  new: "חדש",
  regular: "רגיל",
  senior: "ותיק",
  shift_lead: "אחמ\"ש"
};

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  available: "זמין",
  unavailable: "לא זמין",
  preferred: "מועדף",
  only_if_needed: "רק אם חייבים"
};

export const shiftStatusLabels: Record<ShiftStatus, string> = {
  draft: "טיוטה",
  published: "פורסם"
};

export const swapStatusLabels: Record<SwapStatus, string> = {
  pending_employee: "ממתין לעובד",
  pending_manager: "ממתין למנהל",
  approved: "אושר",
  rejected: "נדחה"
};
