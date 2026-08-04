import type {
  AvailabilityStatus,
  SeniorityLevel,
  ShiftType,
  SwapStatus,
  WarningSeverity
} from "@/types/scheduler";
import {
  availabilityLabels,
  seniorityLabels,
  shiftTypeLabels,
  swapStatusLabels
} from "@/lib/scheduler-labels";

export function ShiftTypeBadge({ type }: { type: ShiftType }) {
  return <span className={`badge ${type}`}>{shiftTypeLabels[type]}</span>;
}

export function SeniorityBadge({ level }: { level: SeniorityLevel }) {
  return <span className="badge">{seniorityLabels[level]}</span>;
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const tone =
    status === "unavailable"
      ? "critical"
      : status === "preferred"
        ? "success"
        : status === "only_if_needed"
          ? "warning"
          : "";

  return <span className={`badge ${tone}`}>{availabilityLabels[status]}</span>;
}

export function SwapStatusBadge({ status }: { status: SwapStatus }) {
  const tone =
    status === "approved"
      ? "success"
      : status === "rejected"
        ? "critical"
        : "warning";

  return <span className={`badge ${tone}`}>{swapStatusLabels[status]}</span>;
}

export function WarningBadge({ severity }: { severity: WarningSeverity }) {
  return (
    <span className={`badge ${severity}`}>
      {severity === "critical" ? "קריטי" : severity === "warning" ? "אזהרה" : "מידע"}
    </span>
  );
}
