"use client";

import { sanitizeErrorMessage, sanitizeRoute } from "@/lib/observability";

type ClientErrorInput = {
  name?: string;
  message?: unknown;
  digest?: string;
  source: "route-boundary" | "global-boundary" | "window-error" | "unhandled-rejection";
};

export function reportClientError(input: ClientErrorInput) {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined") return;

  const message = sanitizeErrorMessage(input.message);
  const route = sanitizeRoute(window.location.pathname);
  const dedupeKey = `shiftpilot_error_reported:${input.source}:${input.name ?? "Error"}:${message}:${route}`;
  if (window.sessionStorage.getItem(dedupeKey)) return;
  window.sessionStorage.setItem(dedupeKey, "1");

  const body = JSON.stringify({
    name: (input.name || "Error").slice(0, 80),
    message,
    digest: input.digest?.slice(0, 100),
    route,
    source: input.source
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/observability/error", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/observability/error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  });
}
