import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import "@/app/pilot-touch-targets.css";
import "@/app/mobile-manager-schedule.css";
import "@/app/mobile-touch-target-fixes.css";
import "@/app/final-schedule-calendar.css";
import "@/app/my-shifts-date-nav.css";

import { WebAnalytics } from "@/components/analytics/web-analytics";
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
        <script dangerouslySetInnerHTML={{ __html: introPrebootScript }} />
        <SiteIntro />
        <AppShell>{children}</AppShell>
        <ClientObservability />
        <NativeNotificationRouter />
        <ServiceWorkerRegister />
        <WebAnalytics />
      </body>
    </html>
  );
}
