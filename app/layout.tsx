import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { introPrebootScript, SiteIntro } from "@/components/brand/site-intro";
import { AppShell } from "@/components/layout/app-shell";
import { NativeNotificationRouter } from "@/components/native/native-notification-router";
import { ClientObservability } from "@/components/observability/client-observability";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { productConfig } from "@/lib/app-config";

export const metadata: Metadata = {
  title: productConfig.name,
  description: productConfig.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: productConfig.shortName,
    statusBarStyle: "default"
  },
  icons: {
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#2158c9", // matches --primary in app/globals.css
  // Lets the page draw under the notch/status bar/home indicator (the
  // Capacitor iOS wrapper's WKWebView renders edge-to-edge by default,
  // same as an installed iOS PWA in standalone mode) so CSS can react
  // via env(safe-area-inset-*) instead of just being covered by it --
  // see the safe-area padding on .topbar / .marketing-navbar-shell /
  // .demo-auth-flow in app/globals.css.
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {/* Must be the literal first thing in <body> -- it runs
            synchronously as the browser parses past it, before any of the
            real page markup below gets painted. See introPrebootScript's
            own comment in site-intro.tsx for why this exists. */}
        <script dangerouslySetInnerHTML={{ __html: introPrebootScript }} />
        <SiteIntro />
        <AppShell>{children}</AppShell>
        <ClientObservability />
        <NativeNotificationRouter />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
