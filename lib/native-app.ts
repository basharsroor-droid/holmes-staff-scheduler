// Client-only check for "is this page running inside the wrapped Capacitor
// app" (iOS today, Android once that platform ships). capacitor.config.ts's
// `server.appendUserAgent` tags every request from the native shell with
// this marker, so a plain `navigator.userAgent` check is enough -- no
// cookies, no middleware, no separate build. Regular browser/PWA visitors
// never carry this string, so this is always false for them.
//
// Deliberately narrow in scope: this exists only to stop the ONE real
// leak back into marketing content from the app's login-first entry
// screen (the brand logo's home link) -- see app/login/page.tsx and
// app/onboarding/page.tsx. It is not a general "native vs web" feature
// flag and shouldn't grow into one without a reason.
const NATIVE_APP_UA_MARKER = "ShiftPilotNativeApp";

export function isNativeApp() {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(NATIVE_APP_UA_MARKER);
}
