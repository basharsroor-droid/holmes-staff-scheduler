"use client";

import { motion } from "motion/react";
import {
  BarChart3,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  Mail,
  Repeat2,
  ShieldCheck,
  Users,
  Wand2
} from "lucide-react";

// Premium two-panel "who it's for" section. Same visual language as the new
// Hero/Navbar (rounded surfaces, brand-blue accents, a dark inset "device"
// panel for product moments) but built with lighter motion.whileInView
// reveals instead of GSAP -- this section doesn't need scroll-jacking, just
// a clean staggered entrance.

const employeePoints = [
  { icon: CalendarCheck, text: "הגשת זמינות לכל משמרת בחודש — מהטלפון" },
  { icon: CheckCircle2, text: "צפייה בסידור העדכני ובמשמרת הקרובה" },
  { icon: Repeat2, text: "בקשת החלפה ומעקב ברור אחר האישורים" },
  { icon: Mail, text: "כניסה מאובטחת לסביבה האישית" }
];

const managerPoints = [
  { icon: BarChart3, text: "תמונה ברורה: מי הגיש, מי חסר ואיפה נדרש שיבוץ" },
  { icon: CalendarRange, text: "בניית הסידור לפי הזמינות והתקנים שהוגדרו" },
  { icon: ShieldCheck, text: "ניהול סניפים, מחלקות, תפקידים והרשאות" },
  { icon: Repeat2, text: "אישור החלפות ותיעוד כל שינוי בסידור" }
];

const employeeShifts = [
  { day: "ראשון", time: "06:00–14:00", label: "פתיחה", tag: "מחר" },
  { day: "שלישי", time: "14:00–22:00", label: "סגירה", tag: "" },
  { day: "חמישי", time: "10:00–18:00", label: "אמצע", tag: "" }
];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } })
};

export function RolesShowcase() {
  return (
    <section className="pro-section roles-section" id="roles">
      <motion.div
        className="section-heading"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
      >
        <p className="pro-kicker dark">לכל אחד, בדיוק מה שהוא צריך</p>
        <h2>למנהל יש שליטה. לעובדים יש ודאות.</h2>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* employee panel */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={cardVariants}
          whileHover={{ y: -6 }}
          className="flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_26px_60px_rgba(15,23,42,0.1)] sm:p-8"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
              <Users size={22} />
            </span>
            <span className="text-sm font-semibold text-[var(--muted)]">סביבת העובד</span>
          </div>
          <h3 className="mb-5 text-xl font-bold text-[var(--ink)] sm:text-2xl">כל עובד יודע מתי הוא עובד ומה אפשר לעשות</h3>

          <ul className="mb-7 flex flex-col gap-3">
            {employeePoints.map((point) => (
              <li key={point.text} className="flex items-center gap-3 text-[15px] text-[var(--ink)]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <point.icon size={16} />
                </span>
                {point.text}
              </li>
            ))}
          </ul>

          <div className="mt-auto rounded-2xl bg-gradient-to-b from-[#10234c] to-[#050c1e] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200/60">המשמרות שלי</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-blue-100">אוגוסט</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {employeeShifts.map((shift) => (
                <div key={shift.day} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/15 text-[11px] font-bold text-blue-300">
                      {shift.day.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{shift.label}</p>
                      <p className="text-[11px] text-neutral-400">{shift.time}</p>
                    </div>
                  </div>
                  {shift.tag && <span className="text-[10px] font-bold text-blue-300">{shift.tag}</span>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* manager panel */}
        <motion.div
          custom={0.12}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={cardVariants}
          whileHover={{ y: -6 }}
          className="flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_26px_60px_rgba(15,23,42,0.1)] sm:p-8"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
              <Wand2 size={22} />
            </span>
            <span className="text-sm font-semibold text-[var(--muted)]">סביבת המנהל</span>
          </div>
          <h3 className="mb-5 text-xl font-bold text-[var(--ink)] sm:text-2xl">כל מה שהמנהל צריך כדי לבנות ולנהל את הסידור</h3>

          <ul className="mb-7 flex flex-col gap-3">
            {managerPoints.map((point) => (
              <li key={point.text} className="flex items-center gap-3 text-[15px] text-[var(--ink)]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <point.icon size={16} />
                </span>
                {point.text}
              </li>
            ))}
          </ul>

          <div className="mt-auto rounded-2xl bg-gradient-to-b from-[#10234c] to-[#050c1e] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200/60">סניף הכרמל · אוגוסט</span>
              <span className="rounded-full bg-blue-400/15 px-2.5 py-1 text-[11px] font-semibold text-blue-300">83% מאויש</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-white">12</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">עובדים</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-blue-300">10</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">הגישו</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-rose-300">2</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">חסרים</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <p className="text-[12px] text-neutral-300">נועה ועומר עדיין לא הגישו זמינות לספטמבר</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
