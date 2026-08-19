"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, CalendarCheck, CheckCircle2, ChevronDown, PlayCircle, Repeat2, ShieldCheck } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Cinematic, scroll-pinned hero for the marketing homepage. Adapted from a
// shadcn-style reference component ("cinematic-landing-hero") built for a
// consumer sobriety-tracking app. Kept: the pinned GSAP scroll timeline, the
// mouse-tracked "premium depth card", film grain / grid background and the
// iPhone mockup shell. Changed for ShiftPilot:
//   - all copy replaced with the real product message, in Hebrew/RTL
//   - the phone screen now shows the actual employee "next shift" view
//     instead of a sobriety streak counter (ShiftPilot has no such metric)
//   - the closing App Store / Google Play badges were dropped -- ShiftPilot
//     has no native app yet (see roadmap phase 7) so real store links would
//     be dead ends -- replaced with the site's actual two CTAs
//   - card gradient and accent colors retinted to the actual brand blue from
//     the logo (was a generic placeholder teal in an earlier pass)
//   - pinned scroll distance shortened from 7000px to 3600px so the hero
//     doesn't dominate the whole first visit before any real content shows
const INJECTED_STYLES = `
  .ch-reveal { visibility: hidden; }

  .ch-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.045; mix-blend-mode: overlay;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%25" height="100%25" filter="url(%23n)"/></svg>');
  }

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
      transform: translateZ(0);
      filter: drop-shadow(0px 10px 20px rgba(53,120,245,0.22)) drop-shadow(0px 2px 4px rgba(53,120,245,0.16));
  }

  .ch-text-card-silver {
      background: linear-gradient(180deg, #FFFFFF 0%, #b6d1fb 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      transform: translateZ(0);
      filter: drop-shadow(0px 12px 24px rgba(0,0,0,0.75)) drop-shadow(0px 4px 8px rgba(0,0,0,0.55));
  }

  .ch-depth-card {
      background: linear-gradient(150deg, #10234c 0%, #050c1e 100%);
      box-shadow:
          0 40px 100px -20px rgba(0,0,0,0.85), 0 20px 40px -20px rgba(0,0,0,0.7),
          inset 0 1px 2px rgba(255,255,255,0.14), inset 0 -2px 4px rgba(0,0,0,0.8);
      border: 1px solid rgba(255,255,255,0.05);
      position: relative;
  }

  .ch-card-sheen {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
      background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(120,170,255,0.1) 0%, transparent 40%);
      mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  .ch-iphone-bezel {
      background-color: #0b0f0e;
      box-shadow: inset 0 0 0 2px #3f4a47, inset 0 0 0 7px #000, 0 40px 80px -15px rgba(0,0,0,0.85), 0 15px 25px -5px rgba(0,0,0,0.65);
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

  .ch-btn-light, .ch-btn-dark { transition: all 0.4s cubic-bezier(0.25,1,0.5,1); }
  .ch-btn-light {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%); color: #0F172A;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .ch-btn-light:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 6px 12px -2px rgba(0,0,0,0.15), 0 20px 32px -6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06); }
  .ch-btn-dark {
      background: linear-gradient(180deg, #192d57 0%, #0b142d 100%); color: #FFFFFF;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.6), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .ch-btn-dark:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 6px 12px -2px rgba(0,0,0,0.7), 0 20px 32px -6px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -3px 6px rgba(0,0,0,0.8); }

  .ch-progress-ring { transform: rotate(-90deg); transform-origin: center; stroke-dasharray: 402; stroke-dashoffset: 402; stroke-linecap: round; }

  .ch-glow { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(90px); }
  .ch-glow-a { width: 480px; height: 480px; top: -160px; right: -100px; background: var(--primary); opacity: .22; }
  .ch-glow-b { width: 420px; height: 420px; bottom: -180px; left: -60px; background: #6c5ce7; opacity: .16; }

  @keyframes ch-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
  .ch-scroll-cue-icon { animation: ch-bounce 1.8s ease-in-out infinite; }

  /* Requested directly: "make the background more interesting than plain
     white" + "like the giant faint wordmark we did in the footer" + "as a
     continuous loop". A slow, subtle breathing wordmark behind everything
     else -- deliberately a plain CSS animation, not tied to the GSAP
     scroll timeline at all, so it can't interact with or break the
     scroll-jacked sequence. It's covered by the opaque card once that
     grows to fill the screen, so it's only visible bookending the
     experience (opening + closing), never competing with the mid-sequence
     content.
     First pass faded the fill to fully transparent by 72% of the letter
     height, which on the light hero background read as barely-there /
     broken. Second pass fixed the color (opaque blue-to-white) but kept
     it dead-center at the same spot as the headline -- on a real screenshot
     the letter strokes visibly cut through "בלי לרדוף אחרי הודעות", unlike
     the footer version this was modeled on, which sits in its own row
     below all the readable text, never overlapping it.
     Third pass: keep the footer's actual layout logic, not just its
     color -- anchor the mark to the BOTTOM of the hero instead of the
     center, sized to bleed past the screen edges (cropped by the hero's
     own overflow:hidden), so it reads as a giant brand mark anchored at
     the base rather than a second line of text fighting the headline for
     the same reading zone.
     Fourth pass: the gradient's near-white stops (#eaf1ff / #ffffff, for
     the "white" half of "blue and white") were close enough to the
     hero's own near-white background (--background-hsl 220 43% 97%) that
     the middle of the word visually vanished into the page -- reported
     live, with a screenshot. Every stop is now a tint of the brand blue
     (never pure white), so the letters stay legible against the
     background across their whole length; opacity raised slightly to
     compensate now that the mark no longer overlaps any readable text. */
  @keyframes ch-bg-loop {
    0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.18; }
    50% { transform: translateX(-50%) scale(1.04); opacity: 0.30; }
  }
  .ch-bg-wordmark {
    position: absolute; bottom: -5%; left: 50%; z-index: 0;
    transform: translateX(-50%);
    font-size: clamp(96px, 20vw, 320px);
    font-weight: 900; letter-spacing: -0.02em; line-height: 1; white-space: nowrap;
    color: transparent;
    background: linear-gradient(120deg, var(--primary-dark) 0%, var(--primary) 35%, color-mix(in srgb, var(--primary) 30%, white) 58%, var(--primary) 78%, var(--primary-dark) 100%);
    -webkit-background-clip: text; background-clip: text;
    filter: drop-shadow(0 18px 44px rgba(33,88,201,0.25)) blur(0.5px);
    pointer-events: none; user-select: none;
    animation: ch-bg-loop 9s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .ch-bg-wordmark { animation: none; opacity: 0.22; }
  }

  /* Plain CSS fade-in, deliberately NOT GSAP/rAF-driven like the rest of the
     Hero -- this is the primary CTA, so it must render and become clickable
     on its own regardless of whether the bigger scroll-jack timeline is
     running (slow devices, reduced-motion setups, etc). */
  @keyframes ch-cta-fade-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .ch-hero-ctas { opacity: 0; animation: ch-cta-fade-in 0.7s ease-out 1.6s both; }
  @media (prefers-reduced-motion: reduce) {
    .ch-hero-ctas { animation-duration: 0.01ms; animation-delay: 0s; }
  }
`;

export function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current || !mockupRef.current) return;
        const rect = mainCardRef.current.getBoundingClientRect();
        mainCardRef.current.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        mainCardRef.current.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
        const xVal = (event.clientX / window.innerWidth - 0.5) * 2;
        const yVal = (event.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(mockupRef.current, { rotationY: xVal * 12, rotationX: -yVal * 12, ease: "power3.out", duration: 1.2 });
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.set(".ch-text-track", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
      gsap.set(".ch-text-line2", { autoAlpha: 1, clipPath: "inset(0 0 0 100%)" });
      // Instead of parking the card fully off-screen, leave a small sliver of
      // its top edge peeking in at the bottom -- a passive hint that there's
      // more to see, so the first screenful doesn't read as an empty void.
      gsap.set(".ch-main-card", { y: window.innerHeight * 0.9, autoAlpha: 1 });
      gsap.set([".ch-card-left-text", ".ch-card-right-text", ".ch-mockup-wrapper", ".ch-floating-badge", ".ch-phone-widget"], { autoAlpha: 0 });
      gsap.set(".ch-cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });
      gsap.set(".ch-scroll-cue", { autoAlpha: 0, y: 10 });

      gsap.timeline({ delay: 0.3 })
        .to(".ch-text-track", { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
        .to(".ch-text-line2", { duration: 1.4, clipPath: "inset(0 0 0 0%)", ease: "power4.inOut" }, "-=1.0")
        .to(".ch-scroll-cue", { duration: 0.8, autoAlpha: 1, y: 0, ease: "power2.out" }, "-=0.5");

      // +=4000, not the earlier +=3600 -- reported live by a user scrolling
      // the real site: with scrub:1, playback speed is tied directly to
      // physical scroll speed, and at a normal fast scroll the closing CTA
      // ("הגיע הזמן להפסיק לרדוף...") flew by unreadably fast. The extra
      // ~400px goes specifically to that beat's hold time below, not spread
      // evenly, so the rest of the sequence keeps its existing pace.
      const scrollTl = gsap.timeline({
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "+=4000", pin: true, scrub: 1, anticipatePin: 1 }
      });

      // The card growing to fill the screen and its content (mockup, badges,
      // copy) fading in used to be sequenced one after another -- for a
      // stretch of the scroll in between, the card was already a full-bleed
      // dark rectangle with nothing inside it yet, which read as the page
      // being broken/empty. Now the content reveal overlaps the resize
      // itself (starts at 1.2 out of the 2.5s resize) instead of waiting
      // for it to finish, so there's no dead full-screen-blank window.
      scrollTl
        .to(".ch-scroll-cue", { autoAlpha: 0, duration: 0.3 }, 0)
        .to([".ch-hero-text-wrapper", ".ch-grid-bg"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, ease: "power2.inOut", duration: 2 }, 0)
        .to(".ch-main-card", { y: 0, width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 2.5 }, 0)
        .fromTo(".ch-mockup-wrapper",
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 2 }, 1.2)
        .fromTo(".ch-phone-widget", { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: "back.out(1.2)", duration: 1.2 }, "-=1.2")
        .to(".ch-progress-ring", { strokeDashoffset: 95, duration: 1.5, ease: "power3.inOut" }, "-=0.9")
        .fromTo(".ch-floating-badge", { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: "back.out(1.5)", duration: 1.2, stagger: 0.15 }, "-=1.2")
        .fromTo(".ch-card-right-text", { x: 50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.2 }, "-=1.0")
        .fromTo(".ch-card-left-text", { x: -50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.2 }, "<")
        .to({}, { duration: 1.5 })
        .set(".ch-hero-text-wrapper", { autoAlpha: 0 })
        // Previously just .set(".ch-cta-wrapper", { autoAlpha: 1 }) -- that
        // made the closing CTA *visible* but left it at its initial
        // scale:0.8 / blur:30px (set when hidden, further up), which only
        // got cleared much later during the "pullback" tween below. Net
        // effect: the text everyone actually needs to read
        // ("הגיע הזמן להפסיק לרדוף...") was on-screen but blurred and
        // shrunk for its entire hold, only sharpening as the card started
        // shrinking away -- reported live by a user as "can't read it
        // because of the speed", and confirmed here it's not just scroll
        // speed, the text is genuinely out of focus during its own hold.
        // Now it reaches full clarity the moment it appears (0.6s reveal),
        // and the redundant unblur tween that used to live in the
        // "pullback" section below has been removed since there's nothing
        // left for it to do.
        .to(".ch-cta-wrapper", { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "power2.out" })
        .to({}, { duration: 2 })
        .to([".ch-mockup-wrapper", ".ch-floating-badge", ".ch-card-left-text", ".ch-card-right-text"], { scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: "power3.in", duration: 1, stagger: 0.05 })
        .to(".ch-main-card", { width: isMobile ? "92vw" : "85vw", height: isMobile ? "92vh" : "85vh", borderRadius: isMobile ? "32px" : "40px", ease: "expo.inOut", duration: 1.5 }, "pullback")
        .to(".ch-main-card", { y: -window.innerHeight - 300, ease: "power3.in", duration: 1.2 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="cinematic-hero-root relative flex h-screen w-screen items-center justify-center overflow-hidden bg-background text-foreground"
      style={{ perspective: "1500px" }}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="ch-grain" aria-hidden="true" />
      <div className="ch-glow ch-glow-a" aria-hidden="true" />
      <div className="ch-glow ch-glow-b" aria-hidden="true" />
      <div className="ch-grid-bg pointer-events-none absolute inset-0 z-0 opacity-60" aria-hidden="true" />
      <div className="ch-bg-wordmark" aria-hidden="true">ShiftPilot</div>

      {/* hints at the pinned card peeking in below before any scroll happens */}
      <div className="ch-scroll-cue ch-reveal pointer-events-none absolute bottom-10 z-10 flex flex-col items-center gap-1.5 text-[var(--muted)]">
        <span className="text-xs font-semibold tracking-wide">גלילה לגילוי המוצר</span>
        <ChevronDown size={20} className="ch-scroll-cue-icon" />
      </div>

      {/* headline layer -- a single <h1> (page-level heading) with two block
          spans doing the two-line reveal, instead of two separate <h1>
          tags. Two H1s on one page is invalid heading structure and broke
          the e2e smoke test's getByRole("heading", {level:1}) query. */}
      <div className="ch-hero-text-wrapper absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <div className="ch-mobile-kicker">ניהול משמרות חכם לעסקים</div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="ch-text-track ch-reveal ch-text-3d mb-2 block">
            כל המשמרות. מקום אחד.
          </span>
          <span className="ch-text-line2 ch-reveal ch-text-brand block font-extrabold">
            בלי לרדוף אחרי הודעות.
          </span>
        </h1>
        <p className="ch-mobile-lead">הגשת זמינות, בניית סידור והחלפות — בתהליך ברור ונוח לכל הצוות.</p>

        {/* Reachable immediately, not gated behind the full pinned-scroll
            story -- a visitor shouldn't have to scroll through the whole
            cinematic sequence just to find the primary CTA. The nicer
            closing CTA further down is a bonus reinforcement, not the only
            way in. */}
        <div className="ch-hero-ctas pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/onboarding" className="ch-btn-light group flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            <span className="text-base font-bold leading-none tracking-tight">פתיחת סביבת עבודה</span>
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          </Link>
          <Link href="/demo" className="ch-btn-dark group flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            <PlayCircle size={18} />
            <span className="text-base font-bold leading-none tracking-tight">לצפייה בדמו</span>
          </Link>
        </div>
      </div>

      {/* closing CTA layer */}
      <div className="ch-cta-wrapper ch-reveal pointer-events-auto absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <h2 className="ch-text-brand mb-6 text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          פחות הודעות. פחות בלבול. יותר שליטה בסידור.
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
          פתחו סביבת עבודה, הגדירו את הסניף הראשון והכינו את הסידור הבא בצורה מסודרת.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/onboarding" className="ch-btn-light group flex items-center justify-center gap-2 rounded-2xl px-8 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            <span className="text-lg font-bold leading-none tracking-tight">פתיחת סביבת עבודה</span>
            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          </Link>
          <Link href="/demo" className="ch-btn-dark group flex items-center justify-center gap-2 rounded-2xl px-8 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            <PlayCircle size={20} />
            <span className="text-lg font-bold leading-none tracking-tight">לצפייה בדמו</span>
          </Link>
        </div>

        {/* Requested directly: the closing CTA felt too bare, just text and
            two buttons. Reuses the exact same 3 short capability titles
            already established and approved in the "יכולות המוצר" section
            further down the page (app/page.tsx `capabilities`), not new
            copy invented for this spot. */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-4 py-2 text-xs font-bold text-[var(--ink)] shadow-sm backdrop-blur-sm sm:text-sm">
            <CalendarCheck size={16} className="text-[var(--primary)]" /> כל הזמינות במקום אחד
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-4 py-2 text-xs font-bold text-[var(--ink)] shadow-sm backdrop-blur-sm sm:text-sm">
            <Repeat2 size={16} className="text-[var(--primary)]" /> החלפות בתהליך ברור
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-4 py-2 text-xs font-bold text-[var(--ink)] shadow-sm backdrop-blur-sm sm:text-sm">
            <ShieldCheck size={16} className="text-[var(--primary)]" /> גישה לפי עסק ותפקיד
          </span>
        </div>
      </div>

      {/* the physical card */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: "1500px" }}>
        <div ref={mainCardRef} className="ch-main-card ch-depth-card ch-reveal pointer-events-auto relative flex h-[92vh] w-[92vw] items-center justify-center overflow-hidden rounded-[32px] md:h-[85vh] md:w-[85vw] md:rounded-[40px]">
          <div className="ch-card-sheen" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-evenly px-4 py-6 lg:grid lg:grid-cols-3 lg:items-center lg:gap-8 lg:py-0 lg:px-12">
            {/* brand wordmark */}
            <div className="ch-card-right-text ch-reveal z-20 order-1 flex w-full justify-center lg:order-3 lg:justify-end">
              <h2 dir="ltr" className="ch-text-card-silver text-6xl font-black italic tracking-tighter md:text-[6rem] lg:text-[7rem]">
                ShiftPilot
              </h2>
            </div>

            {/* phone mockup: employee's real "next shift" view */}
            <div className="ch-mockup-wrapper relative z-10 order-2 flex h-[380px] w-full items-center justify-center lg:order-2 lg:h-[600px]" style={{ perspective: "1000px" }}>
              <div className="relative flex h-full w-full scale-[0.65] items-center justify-center md:scale-[0.85] lg:scale-100">
                <div ref={mockupRef} className="ch-iphone-bezel relative flex h-[580px] w-[280px] flex-col rounded-[3rem] will-change-transform">
                  <div className="ch-hardware-btn absolute -left-[3px] top-[120px] z-0 h-[25px] w-[3px] rounded-s-md" aria-hidden="true" />
                  <div className="ch-hardware-btn absolute -left-[3px] top-[160px] z-0 h-[45px] w-[3px] rounded-s-md" aria-hidden="true" />
                  <div className="ch-hardware-btn absolute -left-[3px] top-[220px] z-0 h-[45px] w-[3px] rounded-s-md" aria-hidden="true" />
                  <div className="ch-hardware-btn absolute -right-[3px] top-[170px] z-0 h-[70px] w-[3px] scale-x-[-1] rounded-e-md" aria-hidden="true" />

                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-[#050f0d] text-white shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                    <div className="ch-screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />
                    <div className="absolute top-[5px] left-1/2 z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                    </div>

                    <div dir="rtl" className="relative flex h-full w-full flex-col px-5 pb-8 pt-12">
                      <div className="ch-phone-widget mb-6 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-200/60">היום</span>
                          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">המשמרות שלי</span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-neutral-200 shadow-lg shadow-black/50">מ</div>
                      </div>

                      <div className="ch-phone-widget relative mx-auto mb-6 flex h-40 w-40 items-center justify-center drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                          <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
                          <circle className="ch-progress-ring" cx="80" cy="80" r="58" fill="none" stroke="#5593f6" strokeWidth="11" />
                        </svg>
                        <div className="z-10 flex flex-col items-center text-center">
                          <span className="text-lg font-extrabold leading-tight tracking-tight text-white">ראשון</span>
                          <span className="text-2xl font-extrabold leading-tight tracking-tight text-white">06:00</span>
                          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-blue-200/60">פתיחה · הכרמל</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="ch-phone-widget flex items-center rounded-2xl p-3">
                          <div className="me-3 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-blue-600/5 shadow-inner">
                            <CalendarCheck size={17} className="text-blue-300 drop-shadow-md" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-neutral-100">זמינות אוגוסט הוגשה</p>
                            <p className="text-[11px] text-neutral-400">6 ימים · מועדף/זמין</p>
                          </div>
                        </div>
                        <div className="ch-phone-widget flex items-center rounded-2xl p-3">
                          <div className="me-3 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 shadow-inner">
                            <Repeat2 size={17} className="text-indigo-300 drop-shadow-md" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-neutral-100">בקשת החלפה אושרה</p>
                            <p className="text-[11px] text-neutral-400">עם נועה · יום שלישי</p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-1/2 h-1 w-[120px] -translate-x-1/2 rounded-full bg-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>
                </div>

                <div className="ch-floating-badge ch-glass-badge absolute left-[-15px] top-6 z-30 flex items-center gap-3 rounded-xl p-3 lg:left-[-90px] lg:top-12 lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/30 bg-gradient-to-b from-blue-500/20 to-blue-900/10 shadow-inner lg:h-10 lg:w-10">
                    <CheckCircle2 size={17} className="text-blue-300 drop-shadow-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-white lg:text-sm">הסידור פורסם</p>
                    <p className="text-[10px] font-medium text-blue-200/60 lg:text-xs">84 משמרות · 96% מאויש</p>
                  </div>
                </div>

                <div className="ch-floating-badge ch-glass-badge absolute bottom-12 right-[-15px] z-30 flex items-center gap-3 rounded-xl p-3 lg:bottom-20 lg:right-[-90px] lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-400/30 bg-gradient-to-b from-indigo-500/20 to-indigo-900/10 shadow-inner lg:h-10 lg:w-10">
                    <Repeat2 size={16} className="text-indigo-300 drop-shadow-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-white lg:text-sm">בקשת החלפה חדשה</p>
                    <p className="text-[10px] font-medium text-blue-200/60 lg:text-xs">ממתינה לאישור מנהל</p>
                  </div>
                </div>
              </div>
            </div>

            {/* description */}
            <div className="ch-card-left-text ch-reveal z-20 order-3 flex w-full flex-col justify-center px-4 text-center lg:order-1 lg:max-w-none lg:px-0 lg:text-right">
              <h3 className="mb-0 text-2xl font-bold tracking-tight text-white md:text-3xl lg:mb-5 lg:text-4xl">
                ניהול משמרות, בלי בלגן.
              </h3>
              <p className="mx-auto hidden max-w-sm text-sm font-normal leading-relaxed text-blue-100/70 md:block md:text-base lg:mx-0 lg:max-w-none lg:text-lg">
                <span className="font-semibold text-white">ShiftPilot</span> מחברת בין העובדים למנהלים בתהליך אחד — הגשת זמינות, בניית סידור, פרסום משמרות והחלפות מאושרות, בלי הודעות פרטיות ובלי טבלאות שאף אחד לא בטוח שהן מעודכנות.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
