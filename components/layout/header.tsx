"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME, NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand-lockup">
          <div className="brand-mark">GS</div>
          <div>
            <div className="brand-name">{APP_NAME}</div>
            <div className="brand-subtitle">Explainable gold intelligence</div>
          </div>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("nav-link", active && "is-active")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <span className="status-pill">Tier-one sources only</span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
