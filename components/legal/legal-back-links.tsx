"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { isNativeApp } from "@/lib/native-app";

// The legal pages' header links. A signed-in user goes back to the workspace.
// A signed-out visitor inside the native app reached /terms or /privacy from
// the login or onboarding screen, and must go back there -- not to the
// marketing homepage, which the app never shows (see app/app/page.tsx).
// Native detection only runs in the browser, so the first render matches the
// server (the website link) and switches after mount, like /login does.
export function LegalBackLinks({ signedIn }: { signedIn: boolean }) {
  const [nativeApp, setNativeApp] = useState(false);
  useEffect(() => setNativeApp(isNativeApp()), []);

  const href = signedIn ? "/workspace" : nativeApp ? "/login" : "/";
  const label = signedIn ? "חזרה למערכת" : nativeApp ? "חזרה לכניסה" : "חזרה לאתר";

  return (
    <>
      <BrandLogo href={href} />
      <Link href={href}>{label}</Link>
    </>
  );
}
