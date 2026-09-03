import { redirect } from "next/navigation";

// Dedicated entry point for the wrapped Capacitor app -- capacitor.config.ts
// points server.url here instead of at "/", so opening the app skips the
// marketing site entirely and never shows it, even to a brand-new user who
// has never had a ShiftPilot account (confirmed explicitly: no homepage
// detour for anyone in-app). The site-wide intro animation (SiteIntro, wired
// into app/layout.tsx) still plays automatically on this first load exactly
// like it does everywhere else, so what a user actually sees is: intro ->
// /login, with no marketing content in between. For native visitors /login
// also exposes a prominent "הקמת עסק חדש" link that opens the public website
// in the system browser, while existing users keep signing in inside the app.
// This reuses the existing, already-tested auth flow instead of building a
// second one.
export default function NativeAppEntryPage() {
  redirect("/login");
}
