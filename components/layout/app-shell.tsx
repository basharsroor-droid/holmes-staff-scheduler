"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { MobileAppDock } from "@/components/layout/mobile-app-dock";

// Root route wrapper. The workspace gets the mobile dock (and bottom padding
// so the dock never covers content); every other page renders as-is.
//
// This used to be the shell of a second, mock-data demo app with its own
// localStorage "auth". That app was removed in F1 (docs/REMEDIATION_PLAN.md);
// authentication lives in Supabase and the workspace's server-side guards.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/workspace")) {
    return (
      <main className="pb-24 md:pb-0">
        {children}
        <MobileAppDock />
      </main>
    );
  }

  return <main>{children}</main>;
}
