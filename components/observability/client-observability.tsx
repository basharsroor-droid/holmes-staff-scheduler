"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/observability-client";

export function ClientObservability() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError({
        name: event.error instanceof Error ? event.error.name : "WindowError",
        message: event.error instanceof Error ? event.error.message : event.message,
        source: "window-error"
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError({
        name: reason instanceof Error ? reason.name : "UnhandledRejection",
        message: reason instanceof Error ? reason.message : String(reason),
        source: "unhandled-rejection"
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
