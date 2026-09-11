"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Repeat2,
  Settings,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Rendered only inside /workspace (see components/layout/app-shell.tsx).

const employeePrimary = [
  { href: "/workspace", label: "בית", icon: Home },
  { href: "/workspace/availability", label: "זמינות", icon: CalendarCheck },
  { href: "/workspace/my-shifts", label: "משמרות", icon: CalendarDays },
  { href: "/workspace/shift-swaps", label: "החלפות", icon: Repeat2 }
];

const managerPrimary = [
  { href: "/workspace", label: "בית", icon: Home },
  { href: "/workspace/schedule-builder", label: "סידור", icon: CalendarRange },
  { href: "/workspace/employees", label: "עובדים", icon: Users },
  { href: "/workspace/command-center", label: "ניהול", icon: CalendarCheck }
];

const employeeMore = [
  { href: "/workspace/notifications", label: "התראות", icon: Bell },
  { href: "/workspace/support", label: "תמיכה", icon: LifeBuoy },
  { href: "/workspace/help", label: "מרכז עזרה", icon: CircleHelp },
  { href: "/workspace/security", label: "אבטחת חשבון", icon: ShieldCheck },
  { href: "/terms", label: "תנאי שימוש", icon: Settings },
  { href: "/privacy", label: "מדיניות פרטיות", icon: ShieldCheck }
];

const managerMore = [
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

type DockRole = "employee" | "manager";

export function MobileAppDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<DockRole>("employee");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
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
    }

    void resolveRole();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setMoreOpen(false), [pathname]);

  const primaryItems = useMemo(() => (role === "employee" ? employeePrimary : managerPrimary), [role]);
  const moreItems = useMemo(() => (role === "employee" ? employeeMore : managerMore), [role]);

  function isActive(href: string) {
    return pathname === href || (href !== "/workspace" && pathname.startsWith(`${href}/`));
  }

  async function logout() {
    setMoreOpen(false);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
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
                    <DockIcon>
                      <Icon className="h-5 w-5" />
                    </DockIcon>
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
                  <strong className="block text-base text-slate-900">עוד ב־ShiftPilot</strong>
                  <small className="text-slate-600">{role === "employee" ? "כלים לעובד/ת" : "כלי ניהול והגדרות"}</small>
                </div>
                <button
                  type="button"
                  className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700"
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
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 transition-colors hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                יציאה
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
