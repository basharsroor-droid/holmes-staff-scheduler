"use client";

import { useEffect } from "react";

// Registers public/sw.js. Production-only and best-effort: a failed
// registration (unsupported browser, blocked by an extension) should
// never affect the app itself, so this deliberately swallows errors
// rather than surfacing them anywhere -- the app works identically
// with or without the service worker, it just loses the offline
// fallback page and the installable-PWA criteria without it.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Intentionally silent -- see comment above.
    });
  }, []);

  return null;
}
