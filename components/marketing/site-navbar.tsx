"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, CalendarCheck, Menu, ShieldCheck, Tag, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { BrandLogo } from "@/components/brand/brand-logo";

const navItems = [
  { href: "/#features", label: "המוצר", detail: "היכולות המרכזיות של ShiftPilot", icon: Boxes },
  { href: "/#how", label: "איך זה עובד", detail: "מהגשת זמינות ועד פרסום הסידור", icon: CalendarCheck },
  { href: "/pricing", label: "תמחור", detail: "מסלולים ברורים לעסקים במשמרות", icon: Tag },
  { href: "/#security", label: "אבטחה", detail: "הרשאות וגישה לפי עסק ותפקיד", icon: ShieldCheck }
];

export function SiteNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="marketing-nav-wrap flex w-full justify-center px-4 pt-5 sm:px-6 sm:pt-6">
      <div className="marketing-nav-bar relative z-10 flex w-full max-w-[1180px] items-center justify-between rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-3 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <BrandLogo href="/" className="[&_img]:h-auto [&_img]:w-[168px] sm:[&_img]:w-[184px]" />
        </motion.div>

        <nav className="hidden items-center gap-7 xl:flex" aria-label="ניווט ראשי">
          {navItems.map((item, index) => (
            <motion.a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[14px] font-semibold text-slate-700 transition-colors hover:text-[var(--primary)]"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              {item.label}
            </motion.a>
          ))}
        </nav>

        <motion.div
          className="hidden shrink-0 items-center gap-2.5 xl:flex"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
        >
          <Link
            href="/login"
            className="whitespace-nowrap px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-[var(--primary)]"
          >
            כניסה
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            צפייה בדמו
          </Link>
          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-4.5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(33,88,201,0.22)] transition-colors hover:bg-[var(--primary-dark)]"
            >
              התחלת ניסיון
              <ArrowLeft size={16} />
            </Link>
          </motion.div>
        </motion.div>

        <motion.button
          type="button"
          className="marketing-menu-trigger flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white xl:hidden"
          onClick={() => setIsOpen(true)}
          whileTap={{ scale: 0.94 }}
          aria-label="פתיחת תפריט"
        >
          <Menu size={22} className="text-slate-800" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="marketing-mobile-menu fixed inset-0 z-50 flex flex-col xl:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <motion.button
              type="button"
              className="marketing-menu-close absolute"
              onClick={() => setIsOpen(false)}
              whileTap={{ scale: 0.92 }}
              aria-label="סגירת תפריט"
            >
              <X size={22} className="text-[var(--ink)]" />
            </motion.button>

            <div className="marketing-menu-brand">
              <BrandLogo href="/" className="[&_img]:h-auto [&_img]:w-[168px]" />
              <span>זמינות, סידורים והחלפות במקום אחד.</span>
            </div>

            <div className="marketing-menu-content">
              <p className="marketing-menu-kicker">ניווט</p>
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  className="marketing-menu-link"
                  onClick={() => setIsOpen(false)}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 + 0.08 }}
                >
                  <item.icon size={20} />
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <ArrowLeft size={18} />
                </motion.a>
              ))}

              <motion.div
                className="marketing-menu-actions"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Link href="/login" onClick={() => setIsOpen(false)} className="rounded-xl border border-[var(--line)] px-5 py-3 text-center text-base font-medium text-[var(--ink)]">
                  כניסה
                </Link>
                <Link href="/demo" onClick={() => setIsOpen(false)} className="rounded-xl border border-[var(--line)] px-5 py-3 text-center text-base font-medium text-[var(--ink)]">
                  צפייה בדמו
                </Link>
                <Link href="/onboarding" onClick={() => setIsOpen(false)} className="rounded-xl bg-[var(--primary)] px-5 py-3 text-center text-base font-semibold text-white">
                  התחלת ניסיון
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
