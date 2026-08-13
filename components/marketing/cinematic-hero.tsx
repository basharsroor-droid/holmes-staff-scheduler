"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, CalendarCheck, CheckCircle2, PlayCircle, Repeat2 } from "lucide-react";

// Static hero -- previously a GSAP scroll-pinned "cinematic" sequence (card
// grows to fill the screen while scrolling, story reveals in stages). Pulled
// after live feedback: scrolling through it read as the page being broken
// (a blank full-screen dark card partway through, a navbar bug it exposed)
// and the effect itself wasn't wanted once seen live -- "destroys the whole
// page" scrolling through it. This keeps the same visual materials (dark
// product card, glow blobs, real "next shift" phone mockup, floating
// badges) but as one normal section that appears once on load/scroll-into-
// view and then just scrolls away normally with the rest of the page, no
// pinning.
const INJECTED_STYLES = `
  .ch-grid-bg {
      background-size: 60px 60px;
      background-image:
          linear-gradient(to right, color-mix(in srgb, var(--ink) 6%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, var(--ink) 6%, transparent) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .ch-text-3d { color: var(--ink); text-shadow: 0 10px 30px rgba(23,32,51,0.18), 0 2px 4px rgba(23,32,51,0.1); }

  .ch-text-brand {
      background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      filter: drop-shadow(0px 6px 14px rgba(53,120,245,0.18));
  }

  .ch-depth-card {
      background: linear-gradient(150deg, #10234c 0%, #050c1e 100%);
      box-shadow:
          0 40px 100px -20px rgba(0,0,0,0.5), 0 20px 40px -20px rgba(0,0,0,0.4),
          inset 0 1px 2px rgba(255,255,255,0.14), inset 0 -2px 4px rgba(0,0,0,0.8);
      border: 1px solid rgba(255,255,255,0.05);
      position: relative;
  }

  .ch-iphone-bezel {
      background-color: #0b0f0e;
      box-shadow: inset 0 0 0 2px #3f4a47, inset 0 0 0 7px #000, 0 30px 60px -15px rgba(0,0,0,0.6);
      transform-style: preserve-3d;
  }

  .ch-hardware-btn {
      background: linear-gradient(90deg, #3a423f 0%, #141a18 100%);
      box-shadow: -2px 0 5px rgba(0,0,0,0.8), inset -1px 0 1px rgba(255,255,255,0.12), inset 1px 0 2px rgba(0,0,0,0.8);
      border-inline-start: 1px solid rgba(255,255,255,0.05);
  }

  .ch-screen-glare { background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%); }

  .ch-widget-depth {
      background: linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%);
      box-shadow: 0 10px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 1px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.03);
  }

  .ch-glass-badge {
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  .ch-btn-light, .ch-btn-dark { transition: all 0.25s ease; }
  .ch-btn-light {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%); color: #0F172A;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(0,0,0,0.15);
  }
  .ch-btn-light:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 6px 12px -2px rgba(0,0,0,0.15), 0 16px 28px -6px rgba(0,0,0,0.22); }
  .ch-btn-dark {
      background: linear-gradient(180deg, #192d57 0%, #0b142d 100%); color: #FFFFFF;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.4), 0 12px 24px -4px rgba(0,0,0,0.5);
  }
  .ch-btn-dark:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 6px 12px -2px rgba(0,0,0,0.5), 0 16px 28px -6px rgba(0,0,0,0.6); }

  .ch-glow { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(100px); }
  .ch-glow-a { width: 480px; height: 480px; top: -160px; inset-inline-end: -100px; background: var(--primary); opacity: .16; }
  .ch-glow-b { width: 420px; height: 420px; bottom: -180px; inset-inline-start: -60px; background: #6c5ce7; opacity: .12; }
`;

export function CinematicHero() {
  return (
    <header className="relative overflow-hidden bg-background pb-16 pt-36 sm:pb-20 sm:pt-44 lg:pt-48">
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="ch-glow ch-glow-a" aria-hidden="true" />
      <div className="ch-glow ch-glow-b" aria-hidden="true" />
      <div className="ch-grid-bg pointer-events-none absolute inset-0 z-0 opacity-50" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 lg:grid-cols-2 lg:gap-12 lg:px-10">
        {/* copy column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center lg:text-right"
        >
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="ch-text-3d block">מהגשת זמינות ועד סידור עבודה —</span>
            <span className="ch-text-brand mt-1 block font-extrabold">בלי כאוס בקבוצת הוואטסאפ.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-lg lg:mx-0">
            <span className="font-semibold text-[var(--ink)]">ShiftPilot</span> מחברת בין העובדים למנהלים בתהליך אחד — הגשת זמינות, בניית סידור, פרסום משמרות והחלפות מאושרות, בלי הודעות פרטיות ובלי טבלאות שאף אחד לא בטוח שהן מעודכנות.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/onboarding" className="ch-btn-light group flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
              <span className="text-base font-bold leading-none tracking-tight">פתיחת סביבת עבודה</span>
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            </Link>
            <Link href="/demo" className="ch-btn-dark group flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
              <PlayCircle size={18} />
              <span className="text-base font-bold leading-none tracking-tight">לצפייה בדמו</span>
            </Link>
          </div>
        </motion.div>

        {/* product card column */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex w-full max-w-md items-center justify-center py-6"
        >
          <div className="ch-depth-card relative flex w-full items-center justify-center overflow-hidden rounded-[32px] px-6 py-10 sm:px-10">
            <div className="relative flex h-[420px] w-[240px] items-center justify-center sm:h-[480px] sm:w-[270px]">
              <div className="ch-iphone-bezel relative flex h-full w-full flex-col rounded-[2.6rem]">
                <div className="ch-hardware-btn absolute -left-[3px] top-[90px] z-0 h-[20px] w-[3px] rounded-s-md" aria-hidden="true" />
                <div className="ch-hardware-btn absolute -left-[3px] top-[120px] z-0 h-[36px] w-[3px] rounded-s-md" aria-hidden="true" />
                <div className="ch-hardware-btn absolute -left-[3px] top-[164px] z-0 h-[36px] w-[3px] rounded-s-md" aria-hidden="true" />
                <div className="ch-hardware-btn absolute -right-[3px] top-[128px] z-0 h-[54px] w-[3px] scale-x-[-1] rounded-e-md" aria-hidden="true" />

                <div className="absolute inset-[6px] z-10 overflow-hidden rounded-[2.2rem] bg-[#050f0d] text-white shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                  <div className="ch-screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />
                  <div className="absolute top-[4px] left-1/2 z-50 flex h-[22px] w-[80px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-2.5 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  </div>

                  <div dir="rtl" className="relative flex h-full w-full flex-col px-4 pb-6 pt-10">
                    <div className="ch-widget-depth mb-4 flex items-center justify-between rounded-xl px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-200/60">היום</span>
                        <span className="text-base font-bold tracking-tight text-white">המשמרות שלי</span>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-neutral-200">מ</div>
                    </div>

                    <div className="ch-widget-depth relative mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full">
                      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                        <circle cx="56" cy="56" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                        <circle cx="56" cy="56" r="42" fill="none" stroke="#5593f6" strokeWidth="9" strokeDasharray="264" strokeDashoffset="95" strokeLinecap="round" transform="rotate(-90 56 56)" />
                      </svg>
                      <div className="z-10 flex flex-col items-center text-center">
                        <span className="text-sm font-extrabold leading-tight text-white">ראשון</span>
                        <span className="text-lg font-extrabold leading-tight text-white">06:00</span>
                        <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-blue-200/60">פתיחה · הכרמל</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="ch-widget-depth flex items-center rounded-xl p-2.5">
                        <div className="me-2.5 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-blue-600/5">
                          <CalendarCheck size={14} className="text-blue-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-neutral-100">זמינות אוגוסט הוגשה</p>
                          <p className="text-[9px] text-neutral-400">6 ימים · מועדף/זמין</p>
                        </div>
                      </div>
                      <div className="ch-widget-depth flex items-center rounded-xl p-2.5">
                        <div className="me-2.5 flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5">
                          <Repeat2 size={14} className="text-indigo-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-neutral-100">בקשת החלפה אושרה</p>
                          <p className="text-[9px] text-neutral-400">עם נועה · יום שלישי</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="ch-glass-badge absolute -left-6 top-8 z-30 flex items-center gap-2.5 rounded-xl p-2.5 sm:-left-12"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-400/30 bg-gradient-to-b from-blue-500/20 to-blue-900/10">
                  <CheckCircle2 size={14} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">הסידור פורסם</p>
                  <p className="text-[9px] font-medium text-blue-200/60">84 משמרות · 96% מאויש</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -14, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                className="ch-glass-badge absolute -right-6 bottom-10 z-30 flex items-center gap-2.5 rounded-xl p-2.5 sm:-right-12"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/30 bg-gradient-to-b from-indigo-500/20 to-indigo-900/10">
                  <Repeat2 size={13} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">בקשת החלפה חדשה</p>
                  <p className="text-[9px] font-medium text-blue-200/60">ממתינה לאישור מנהל</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
