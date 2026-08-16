"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, LayoutDashboard, Menu, ShieldCheck, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { BrandLogo } from "@/components/brand/brand-logo";

const navItems = [
  { href: "#how", label: "איך זה עובד", detail: "מהרשמה ועד פרסום הסידור", icon: CalendarCheck },
  { href: "#roles", label: "למי זה מתאים", detail: "חוויה נפרדת למנהל ולעובד", icon: Users },
  { href: "#example", label: "המערכת בפעולה", detail: "דוגמה למבנה משמרות גמיש", icon: LayoutDashboard },
  { href: "#security", label: "אבטחה והרשאות", detail: "גישה לפי עסק, סניף ותפקיד", icon: ShieldCheck }
];

// Floating pill navbar for the marketing site. Adapted from a shadcn-style
// "Navbar1" reference component: kept the floating-pill shape, scroll-in
// links and slide-in mobile panel, swapped the placeholder circle mark for
// the real ShiftPilot logo, translated content to Hebrew/RTL, and replaced
// the single "Get Started" CTA with the site's actual three actions
// (login / demo / open a business) since ShiftPilot has both an existing
// customer path and a pilot demo, not just one signup funnel.
export function SiteNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="marketing-nav-wrap flex w-full justify-center px-4 py-6">
      {/* bg-white/95 (not bg-[var(--surface)]/95) -- Tailwind's opacity
          slash-modifier needs the color in rgb-channel form to compose;
          against an arbitrary var() holding a hex string it silently
          resolves to a fully transparent background instead. That bug was
          invisible over the light page background at the top of the page,
          but turned the whole pill invisible once scrolled over the dark
          Hero card -- reported live by a user scrolling the real site. */}
      {/* max-w-3xl was too narrow for the full row (logo + 4 nav links +
          3 actions) at real Hebrew text widths -- individual nav links
          were wrapping onto two lines mid-phrase ("אבטחה" / "והרשאות" on
          separate lines), reported live by a user looking at the actual
          site. max-w-4xl plus whitespace-nowrap on every link is the
          standard fix: give the pill enough room and make sure a link's
          own text is never allowed to break internally regardless. */}
      <div className="marketing-nav-bar relative z-10 flex w-full max-w-4xl items-center justify-between rounded-full bg-white/95 px-4 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur sm:px-6 sm:py-3">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
          <BrandLogo href="/" />
        </motion.div>

        {/* md: (768px) genuinely isn't enough room for the full pill (logo +
            4 nav links + 3 actions) at real Hebrew text widths -- checked
            directly and it overflows the viewport around 820-950px, cut
            off on both edges. lg: (1024px) is where the actual measured
            content width (~970px) comfortably fits; the mobile hamburger
            menu below now correctly covers that whole in-between range
            instead of a half-broken squeezed desktop layout. */}
        <nav className="hidden items-center gap-5 lg:flex lg:gap-7">
          {navItems.map((item, index) => (
            <motion.a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm font-medium text-[var(--ink)] transition-colors hover:text-[var(--primary)]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              {item.label}
            </motion.a>
          ))}
        </nav>

        <motion.div
          className="hidden items-center gap-2 lg:flex"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Link href="/demo" className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:text-[var(--primary)]">
            צפייה בדמו
          </Link>
          <Link href="/login" className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:text-[var(--primary)]">
            כניסה
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(19,111,99,0.35)] transition-colors hover:bg-[var(--primary-dark)]"
            >
              פתיחת עסק
            </Link>
          </motion.div>
        </motion.div>

        <motion.button
          type="button"
          className="marketing-menu-trigger flex items-center lg:hidden"
          onClick={() => setIsOpen(true)}
          whileTap={{ scale: 0.9 }}
          aria-label="פתיחת תפריט"
        >
          <Menu size={24} className="text-[var(--ink)]" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="marketing-mobile-menu fixed inset-0 z-50 flex flex-col lg:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            <motion.button
              type="button"
              className="marketing-menu-close absolute"
              onClick={() => setIsOpen(false)}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              aria-label="סגירת תפריט"
            >
              <X size={22} className="text-[var(--ink)]" />
            </motion.button>

            <div className="marketing-menu-brand"><BrandLogo href="/" /><span>זמינות, סידורים והחלפות במקום אחד.</span></div>
            <div className="marketing-menu-content">
              <p className="marketing-menu-kicker">ניווט מהיר</p>
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  className="marketing-menu-link"
                  onClick={() => setIsOpen(false)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 + 0.1 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <item.icon size={20} />
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <ArrowLeft size={18} />
                </motion.a>
              ))}

              <motion.div
                className="marketing-menu-actions"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                exit={{ opacity: 0, y: 16 }}
              >
                <Link href="/demo" onClick={() => setIsOpen(false)} className="rounded-full border border-[var(--line)] px-5 py-3 text-center text-base font-medium text-[var(--ink)]">
                  צפייה בדמו
                </Link>
                <Link href="/login" onClick={() => setIsOpen(false)} className="rounded-full border border-[var(--line)] px-5 py-3 text-center text-base font-medium text-[var(--ink)]">
                  כניסה
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-[var(--primary)] px-5 py-3 text-center text-base font-semibold text-white"
                >
                  פתיחת עסק
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
