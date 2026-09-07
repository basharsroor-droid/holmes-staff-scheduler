"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Dock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <nav
      className={cn(
        "flex items-center justify-around gap-1 rounded-[24px] border border-slate-200/90 bg-white/95 px-2 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl",
        className
      )}
      aria-label="ניווט מהיר"
    >
      {children}
    </nav>
  );
}

export function DockItem({
  children,
  active = false,
  onClick,
  label
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  const className = cn(
    "relative flex min-h-12 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold transition-colors",
    active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function DockIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-5 w-5 items-center justify-center">{children}</span>;
}

export function DockLabel({ children }: { children: ReactNode }) {
  return <span className="max-w-full truncate leading-none">{children}</span>;
}
