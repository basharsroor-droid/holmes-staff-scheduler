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
    // /app is a dedicated native-entry route (app/app/page.tsx) that
    // redirects straight to /login -- so opening the app never shows
    // marketing content, matching what was asked for explicitly
    // (login-first, no homepage detour, app-only -- the regular website at
    // "/" is completely unaffected).
    //
    // The path has to live in `url` itself, not in `appStartPath`: that
    // option was tried first and crashes on launch for this project's
    // remote-only setup -- CAPBridgeViewController.loadWebView() (see
    // node_modules/@capacitor/ios/.../CAPBridgeViewController.swift) checks
    // for a matching file in the *local bundled* webDir before it ever
    // looks at appStartServerURL, and since this project deliberately
    // ships no real bundled content (server.url does all the loading --
    // see capacitor-www/README.md), that file never exists and the app
    // hard-crashes via fatalLoadError(). Confirmed by reading the crash
    // output directly, not guessed.
    url: "https://www.shiftpilothq.com/app",
    // Required alongside the path above for a second, separate reason:
    // WebViewDelegationHandler's navigation-policy check (decidePolicyFor
    // navigationAction) treats a URL as "in the app" only when its full
    // string starts with `server.url`'s full string. With a path on `url`,
    // the very first same-origin redirect (/app -> /login) already fails
    // that prefix match and gets bounced out to system Safari instead of
    // staying in the WebView -- confirmed live in the simulator (Safari
    // opened with a "< ShiftPilot" back-to-app indicator). `allowNavigation`
    // is checked earlier in that same function and matches by hostname
    // only, independent of path, so it correctly keeps all in-domain
    // navigation inside the app regardless of which path `url` carries.
    allowNavigation: ["www.shiftpilothq.com"],
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
  appendUserAgent: "ShiftPilotNativeApp",
  plugins: {
    LocalNotifications: {
      presentationOptions: ["sound", "banner", "list"]
    }
  }
};

export default config;
