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
    url: "https://www.shiftpilothq.com",
    // https-only everywhere, including Android's WebView origin --
    // this app sets Supabase session cookies and security headers
    // (HSTS, CSP-adjacent) that assume https, and cleartext http
    // would break both silently.
    cleartext: false,
    androidScheme: "https"
  }
};

export default config;
