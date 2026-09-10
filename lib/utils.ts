import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Type guard for Array.prototype.filter. `.filter(Boolean)` removes nulls at
// runtime but TypeScript does not narrow `T | null` to `T` through it, which is
// why the schedule-builder ranking code had been papering over it with `as any`.
// Unlike Boolean, this keeps falsy-but-present values such as 0 and "".
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
