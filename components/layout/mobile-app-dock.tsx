"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  Home,
  LifeBuoy,
  Menu,
  Repeat2,
  Settings,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import type { AuthUser } from "@/lib/auth-config";
import { AUTH_USER_KEY } from "@/lib/local-storage-keys";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const workspaceEmployeePrimary = [
  { href: "/workspace", label: "בית", icon: Home },
  { href: "/workspace/availability", label: "זמינות", icon: CalendarCheck },
  { href: "/workspace/my-shifts", label: "משמרות", icon: CalendarDays },
  { href: "/workspace/shift-swaps", label: "החלפות", icon: Repeat2 }
];

const workspaceManagerPrimary = [
  { href: "/workspace", label: "בית", icon: Home },
  { href: "/workspace/schedule-builder", label: "סידור", icon: CalendarRange },
  { href: "/workspace/employees", label: "עובדים", icon: Users },
  { href: "/workspace/command-center", label: "ניהול", icon: CalendarCheck }
];

const legacyEmployeePrimary = [
  { href: "/availability", label: "זמינות", icon: CalendarCheck },
  { href: "/my-shifts", label: "משמרות", icon: CalendarDays },
  { href: "/schedule", label: "סידור", icon: CalendarRange },
  { href: "/swap-requests", label: "החלפות", icon: Repeat2 }
];

const legacyManagerPrimary = [
  { href: "/manager", label: "בית", icon: Home },
  { href: "/manager/schedule", label: "סידור", icon: CalendarRange },
  { href: "/admin/employees", label: "עובדים", icon: Users },
  { href: "/schedule", label: "לוח", icon: CalendarDays }
];

const workspaceEmployeeMore = [
  { href: "/workspace/notifications", label: "התראות", icon: Bell },
  { href: "/workspace/support", label: "תמיכה", icon: LifeBuoy },
  { href: "/workspace/help", label: "מרכז עזרה", icon: CircleHelp },
  { href: "/workspace/security", label: "אבטחת חשבון", icon: ShieldCheck },
  { href: "/terms", label: "תנאי שימוש", icon: Settings },
  { href: "/privacy", label: "מדיניות פרטיות", icon: ShieldCheck }
];

const workspaceManagerMore = [
  { href: "/workspace/shift-templates", label: "סוגי משמרות", icon: Settings },
  { href: "/workspace/work-months", label: "חודשי עבודה", icon: CalendarDays },
  { href: "/workspace/submissions", label: "מעקב הגשות", icon: CalendarCheck },
  { href: "/workspace/open-shifts", label: "משמרות פתוחות", icon: CalendarRange },
  { href: "/workspace/shift-swaps", label: "בקשות החלפה", icon: Repeat2 },
  { href: "/workspace/notifications", label: "התראות", icon: Bell },
  { href: "/workspace/support", label: "תמיכה", icon: LifeBuoy },
  { href: "/workspace/help", label: "מרכז עזרה", icon: CircleHelp },
  { href: "/workspace/security", label: "אבטחה", icon: ShieldCheck },
  { href: "/terms", label: "תנאי שימוש", icon: Settings },
  { href: "/privacy", label: "מדיניות פרטיות", icon: ShieldCheck }
];

const legacyEmployeeMore = [
  { href: "/manager-requests", label: "בקשות להנהלה", icon: CalendarCheck },
  { href: "/demo/help", label: "עזרה ותמיכה", icon: LifeBuoy },
  { href: "/terms", label: "תנאי שימוש", icon: Settings },
  { href: "/privacy", label: "מדיניות פרטיות", icon: ShieldCheck }
];

const legacyManagerMore = [
  { href: "/swap-requests", label: "החלפות", icon: Repeat2 },
  { href: "/admin/shift-templates", label: "תבניות", icon: Settings },
  { href: "/demo/help", label: "עזרה ותמיכה", icon: LifeBuoy },
  { href: "/terms", label: "תנאי שימוש", icon: Settings },
  { href: "/privacy", label: "מדיניות פרטיות", icon: ShieldCheck }
];

type DockRole = "employee" | "manager";

export function MobileAppDock() {
  const pathname = usePathname();
  const [role, setRole] = useState<DockRole>("employee");
  const [moreOpen, setMoreOpen] = useState(false);
  const isWorkspace = pathname.startsWith("/workspace");

  useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      if (isWorkspace) {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || cancelled) return;
          const { data } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", user.id)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
          if (!cancelled) setRole(data?.role === "employee" ? "employee" : "manager");
        } catch {
          if (!cancelled) setRole("employee");
        }
        return;
      }

      const raw = window.localStorage.getItem(AUTH_USER_KEY) ?? window.sessionStorage.getItem(AUTH_USER_KEY);
      if (!raw) return;
      try {
        const user = JSON.parse(raw) as AuthUser;
        if (!cancelled) setRole(user.role === "employee" ? "employee" : "manager");
      } catch {
        if (!cancelled) setRole("employee");
      }
    }

    void resolveRole();
    return () => { cancelled = true; };
  }, [isWorkspace]);

  useEffect(() => setMoreOpen(false), [pathname]);

  const primaryItems = useMemo(() => {
    if (isWorkspace) return role === "employee" ? workspaceEmployeePrimary : workspaceManagerPrimary;
    return role === "employee" ? legacyEmployeePrimary : legacyManagerPrimary;
  }, [isWorkspace, role]);

  const moreItems = useMemo(() => {
    if (isWorkspace) return role === "employee" ? workspaceEmployeeMore : workspaceManagerMore;
    return role === "employee" ? legacyEmployeeMore : legacyManagerMore;
  }, [isWorkspace, role]);

  function isActive(href: string) {
    return pathname === href || (href !== "/workspace" && pathname.startsWith(`${href}/`));
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 md:hidden"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto mx-auto max-w-md">
          <Dock>
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="contents">
                  <DockItem label={item.label} active={isActive(item.href)}>
                    <DockIcon><Icon className="h-5 w-5" /></DockIcon>
                    <DockLabel>{item.label}</DockLabel>
                  </DockItem>
                </Link>
              );
            })}
            <DockItem label="עוד" active={moreOpen} onClick={() => setMoreOpen((open) => !open)}>
              <DockIcon>{moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</DockIcon>
              <DockLabel>עוד</DockLabel>
            </DockItem>
          </Dock>
        </div>
      </div>

      <AnimatePresence>
        {moreOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="סגירת תפריט"
              className="fixed inset-0 z-[71] bg-slate-950/20 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.aside
              className="fixed inset-x-3 z-[72] mx-auto max-w-md rounded-[28px] border border-slate-200 bg-white p-4 shadow-2xl md:hidden"
              style={{ bottom: "calc(86px + max(10px, env(safe-area-inset-bottom)))" }}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              aria-label="תפריט נוסף"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <strong className="block text-base text-slate-900">עוד ב-ShiftPilot</strong>
                  <small className="text-slate-500">{role === "employee" ? "כלים לעובד/ת" : "כלי ניהול והגדרות"}</small>
                </div>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
                  onClick={() => setMoreOpen(false)}
                  aria-label="סגירה"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-14 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition-colors ${
                        isActive(item.href)
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
