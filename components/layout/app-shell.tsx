"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  Clock3,
  Menu,
  MessageSquareText,
  MonitorPlay,
  Repeat2,
  Settings,
  Users,
  Wand2,
  X
} from "lucide-react";

import {
  defaultBranchId,
  defaultOrganizationId,
  getOrganizationById
} from "@/lib/app-config";
import { BrandLogo } from "@/components/brand/brand-logo";
import { employees, managerEmployeeId } from "@/lib/mock-data";
import type { AuthUser } from "@/lib/auth-config";
import { AUTH_USER_KEY, DEMO_USER_KEY } from "@/lib/local-storage-keys";
import type { Employee, UserRole } from "@/types/scheduler";

const employeeNav = [
  { href: "/availability", label: "הגשת סידור", icon: CalendarCheck },
  { href: "/my-shifts", label: "המשמרות שלי", icon: Clock3 },
  { href: "/schedule", label: "לוח עבודה סופי", icon: CalendarCheck },
  { href: "/swap-requests", label: "החלפות", icon: Repeat2 },
  { href: "/manager-requests", label: "בקשות להנהלה", icon: MessageSquareText }
];

const managerNav = [
  { href: "/pilot", label: "סביבת ניסיון", icon: MonitorPlay },
  { href: "/manager", label: "מרכז הניהול", icon: CalendarCheck },
  { href: "/manager/schedule", label: "סידור עבודה", icon: Wand2 },
  { href: "/schedule", label: "לוח עבודה סופי", icon: CalendarCheck },
  { href: "/swap-requests", label: "החלפות", icon: Repeat2 },
  { href: "/admin/employees", label: "עובדים", icon: Users },
  { href: "/admin/shift-templates", label: "תבניות", icon: Settings }
];

const managerOnlyRoutes = ["/pilot", "/manager", "/admin"];

function isManagerOnlyRoute(pathname: string) {
  return managerOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const roleLabels: Record<UserRole, string> = {
  employee: "עובד",
  manager: "מנהל/ת",
  admin: "אדמין"
};

function getNavForEmployee(employee: Employee) {
  if (employee.role === "employee") return employeeNav;
  return managerNav;
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    organizationId: user.organizationId ?? defaultOrganizationId,
    branchId: user.branchId ?? defaultBranchId
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSaasRoute =
    pathname === "/app" ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/demo" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/about" ||
    pathname === "/offline" ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/auth/");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(managerEmployeeId);
  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) ??
      employees.find((employee) => employee.id === managerEmployeeId) ??
      employees[0],
    [selectedEmployeeId]
  );
  useEffect(() => {
    const storedAuth =
      window.localStorage.getItem(AUTH_USER_KEY) ??
      window.sessionStorage.getItem(AUTH_USER_KEY);
    if (storedAuth) {
      const parsedUser = normalizeAuthUser(JSON.parse(storedAuth) as AuthUser);
      if (parsedUser.role === "employee" && isManagerOnlyRoute(pathname)) {
        router.replace("/employee");
        return;
      }
      setAuthUser(parsedUser);
      setSelectedEmployeeId(parsedUser.id);
    } else if (pathname !== "/" && !isSaasRoute) {
      router.replace("/");
    }
    setAuthChecked(true);
  }, [isSaasRoute, pathname, router]);

  useEffect(() => setMobileNavOpen(false), [pathname]);

  function logout() {
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(DEMO_USER_KEY);
    window.sessionStorage.removeItem(AUTH_USER_KEY);
    window.sessionStorage.removeItem(DEMO_USER_KEY);
    router.replace("/");
  }

  if (pathname === "/" || isSaasRoute) {
    return <main>{children}</main>;
  }

  if (!authChecked || !authUser) {
    return <main className="page">מעביר למסך כניסה...</main>;
  }

  const displayName = `${authUser.firstName} ${authUser.lastName}`.trim();
  const roleLabel = roleLabels[authUser.role];
  const organization = getOrganizationById(authUser.organizationId);
  const navUser = {
    ...selectedEmployee,
    role: authUser.role,
    fullName: displayName || selectedEmployee.fullName
  };
  const privateNavItems = getNavForEmployee(navUser);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="demo-brand"><BrandLogo href="/demo" /><small>{organization.businessName} · {organization.branchName}</small></div>

          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileNavOpen ? "סגירת תפריט" : "פתיחת תפריט"}
            aria-expanded={mobileNavOpen}
            aria-controls="private-navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            <span className="sr-only">תפריט</span>
          </button>

          <nav id="private-navigation" className={`nav${mobileNavOpen ? " mobile-open" : ""}`} aria-label="ניווט ראשי">
            {privateNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  className={`nav-link${isActive ? " active" : ""}`}
                  href={item.href}
                  key={item.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <div className="mobile-user-panel">
              <div className="role-pill">
                <span className="dot" style={{ background: selectedEmployee.color }} />
                {displayName || selectedEmployee.fullName} · {roleLabel}
              </div>
              <button className="button" onClick={logout}>יציאה</button>
            </div>
          </nav>

          <div className="user-switcher" aria-label="פרטי המשתמש המחובר">
            <div className="role-pill">
              <span className="dot" style={{ background: selectedEmployee.color }} />
              {displayName || selectedEmployee.fullName} · {roleLabel} ·{" "}
              {organization.businessName}
            </div>
            <button className="button" onClick={logout}>
              יציאה
            </button>
          </div>
        </div>
      </header>
      <div className="workspace-strip">
        <div>
          <strong>סביבת עבודה:</strong> {organization.businessName} ·{" "}
          {organization.branchName}
        </div>
        <span>{organization.industryLabel}</span>
      </div>
      <main className="page">{children}</main>
    </div>
  );
}
