export type SubmissionAccessMode = "auto" | "open" | "closed";

export function isAutoSubmissionOpen(date = new Date()) {
  const dayOfMonth = date.getDate();
  return dayOfMonth >= 22 && dayOfMonth <= 28;
}

export function resolveSubmissionAccess(mode: SubmissionAccessMode, date = new Date()) {
  if (mode === "open") return true;
  if (mode === "closed") return false;
  return isAutoSubmissionOpen(date);
}

export function getSubmissionWindowLabel(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `22/${String(month).padStart(2, "0")}/${year} - 28/${String(month).padStart(2, "0")}/${year}`;
}
