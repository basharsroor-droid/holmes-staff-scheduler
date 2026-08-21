const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~-]+/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const longSecretPattern = /\b[A-Za-z0-9_-]{32,}\b/g;

export function sanitizeErrorMessage(value: unknown) {
  if (typeof value !== "string") return "Unknown client error";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "Unknown client error";
  return normalized
    .replace(emailPattern, "[email]")
    .replace(bearerPattern, "Bearer [redacted]")
    .replace(jwtPattern, "[token]")
    .replace(longSecretPattern, "[secret]")
    .slice(0, 500);
}

export function sanitizeRoute(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/unknown";
  return value.split(/[?#]/, 1)[0].slice(0, 200) || "/unknown";
}
