import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { SiteIntro } from "@/components/brand/site-intro";
import { AppShell } from "@/components/layout/app-shell";
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
  themeColor: "#2158c9" // matches --primary in app/globals.css
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <SiteIntro />
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
