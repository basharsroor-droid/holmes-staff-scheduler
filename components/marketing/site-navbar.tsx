"use client";

import Link from "next/link";
import { CirclePlay, LogIn, UserPlus } from "lucide-react";
import { motion } from "motion/react";

import { BrandLogo } from "@/components/brand/brand-logo";

export function SiteNavbar() {
  return (
    <div className="marketing-nav-wrap flex w-full justify-center px-3 pt-4 sm:px-6 sm:pt-6">
      <div className="marketing-nav-bar relative z-10 flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex-nowrap sm:px-6">
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <BrandLogo
            href="/"
            className="[&_img]:h-auto [&_img]:w-[145px] sm:[&_img]:w-[175px] lg:[&_img]:w-[190px]"
          />
        </motion.div>

        <motion.div
          className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-2.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
        >
          <Link
            href="/demo"
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 sm:flex-none sm:px-4 sm:text-sm"
          >
            <CirclePlay size={16} />
            צפייה בדמו
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--primary)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--primary)] transition-all hover:bg-[var(--primary-soft)] sm:flex-none sm:px-4 sm:text-sm"
          >
            <UserPlus size={16} />
            הרשמה
          </Link>

          <motion.div className="flex-1 sm:flex-none" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/login"
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--primary)] px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(33,88,201,0.22)] transition-colors hover:bg-[var(--primary-dark)] sm:w-auto sm:px-4 sm:text-sm"
            >
              <LogIn size={16} />
              כניסה למערכת
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
