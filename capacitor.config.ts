import type { CapacitorConfig } from "@capacitor/cli";

// This wraps the SAME Next.js app that already runs at
// shiftpilothq.com -- not a rebuild, not a static export. That's the
// whole point of choosing Capacitor over React Native (see roadmap
// phase 7): the app has server-rendered pages, API routes, and live
// Supabase-backed data that a static `next export` bundle can't serve.
// So instead of bundling web assets into the native app, `server.url`
// points the native WebView straight at the live production site --
// the native shell is a thin wrapper, all real logic and data stay on
// the server exactly as they do for the website today.
//
// `webDir` below is required by the Capacitor CLI but is not what
// actually loads at runtime once `server.url` is set -- see
// capacitor-www/README.md.
const config: CapacitorConfig = {
  appId: "com.shiftpilothq.app",
  appName: "ShiftPilot",
  webDir: "capacitor-www",
  server: {
    // /app is a dedicated native-entry route (app/app/page.tsx), not the
    // marketing homepage -- it redirects straight to /login, so opening the
    // app never shows marketing content, matching what was asked for
    // explicitly (login-first, no homepage detour, app-only -- the regular
    // website at "/" is completely unaffected).
    url: "https://www.shiftpilothq.com/app",
    // https-only everywhere, including Android's WebView origin --
    // this app sets Supabase session cookies and security headers
    // (HSTS, CSP-adjacent) that assume https, and cleartext http
    // would break both silently.
    cleartext: false,
    androidScheme: "https"
  },
  // Tags every request from the wrapped app's WebView so the site can tell
  // "running inside the native shell" apart from a regular mobile browser --
  // see lib/native-app.ts, used to stop the one real leak back into
  // marketing content (the brand logo's home link) on the app's login-first
  // screens. A top-level CapacitorConfig option, not nested under `server`.
  // Scoped narrowly on purpose.
  appendUserAgent: "ShiftPilotNativeApp"
};

export default config;
