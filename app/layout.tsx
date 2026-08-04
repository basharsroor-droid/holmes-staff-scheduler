import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Holmes Staff Scheduler Pilot",
  description: "פיילוט לניהול זמינות, שיבוצים, החלפות וסידור עבודה לעובדים."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
