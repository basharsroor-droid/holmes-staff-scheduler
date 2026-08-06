import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { SiteIntro } from "@/components/brand/site-intro";
import { AppShell } from "@/components/layout/app-shell";
import { productConfig } from "@/lib/app-config";

export const metadata: Metadata = {
  title: productConfig.name,
  description: productConfig.description
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
      </body>
    </html>
  );
}
