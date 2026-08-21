"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_KEY = "shiftpilot_code_intro_seen_v1";
const tagline = "THE EASY WAY TO YOUR NEXT SHIFT".split(" ");

// Reported live (2026-08-19): the site/app was visible for a beat before
// the intro appeared, instead of the intro covering the screen from the
// very first frame. Root cause -- this is a plain SSR/hydration fact, not
// something React-side logic can fix on its own: the browser paints the
// server-rendered HTML before ANY JavaScript runs, including this
// component's own mount effect below. `visible` has to start `false` here
// (sessionStorage/matchMedia aren't available during SSR, so there's no
// way to know the right answer yet without a hydration mismatch) -- which
// means the underlying page is guaranteed to paint first no matter how
// fast the effect fires afterward.
//
// Fixed the standard way real "no-flash" scripts do it (same idea as a
// dark-mode preboot script): introPrebootScript below runs as the literal
// first thing inside <body> (see app/layout.tsx), synchronously, before
// the browser paints anything that comes after it in the HTML. If the
// intro should show, it inserts a plain, non-React placeholder covering
// the screen with the exact same background the real overlay uses, so by
// the time this component hydrates and takes over, there's nothing to
// visibly hand off -- the placeholder and the real overlay look
// identical. The mount effect below removes the placeholder the instant
// React's own overlay is ready to take its place.
export const introPrebootScript = `(function(){try{
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (sessionStorage.getItem("${INTRO_KEY}")) return;
  document.documentElement.classList.add("si-lock");
  var el = document.createElement("div");
  el.id = "si-preboot";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "position:fixed;inset:0;z-index:999999;background:radial-gradient(120% 120% at 50% 40%, var(--intro-bg-end) 0%, var(--intro-bg-start) 70%)";
  document.body.appendChild(el);
}catch(e){}})();`;

export function SiteIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const finish = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.sessionStorage.setItem(INTRO_KEY, "1");
    window.setTimeout(() => {
      document.documentElement.classList.remove("si-lock");
      setVisible(false);
    }, 650);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.sessionStorage.getItem(INTRO_KEY)) return;
    document.documentElement.classList.add("si-lock");
    // Hand off from the preboot placeholder (see introPrebootScript above)
    // to this real, interactive overlay -- same background, so removing
    // it right as `visible` flips true is visually seamless.
    document.getElementById("si-preboot")?.remove();
    setVisible(true);
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setStarted(true)));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let particles: Array<{ x: number; y: number; radius: number; phase: number; speed: number }> = [];
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      width = canvas.width = canvas.clientWidth * ratio;
      height = canvas.height = canvas.clientHeight * ratio;
      const count = Math.min(Math.round((width * height) / (18000 * ratio * ratio)), 140);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        radius: Math.random() * 1.4 * ratio + 0.3,
        phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.8
      }));
    }

    function draw(time: number) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const alpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * 0.001 * particle.speed + particle.phase));
        context.beginPath();
        context.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    animationFrame = window.requestAnimationFrame(draw);
    const autoFinish = window.setTimeout(finish, 3600);

    return () => {
      window.clearTimeout(autoFinish);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [finish, visible]);

  if (!visible) return null;

  return <div className={`si-overlay ${started ? "si-started" : ""} ${leaving ? "si-exit" : ""}`} role="presentation" aria-hidden="true">
    <canvas ref={canvasRef} className="si-canvas" />
    <div className="si-content">
      <div className="si-logo">
        <span className="si-streaks"><span /><span /><span /></span>
        <span className="si-word si-word--1">Shift</span><span className="si-word si-word--2">Pilot</span>
      </div>
      <div className="si-swoosh-wrap">
        <svg className="si-swoosh-svg" viewBox="0 0 470 100" preserveAspectRatio="xMidYMid meet">
          <defs><linearGradient id="si-swoosh-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--intro-blue)" /><stop offset="45%" stopColor="var(--intro-blue2)" /><stop offset="80%" stopColor="var(--intro-purple)" /><stop offset="100%" stopColor="var(--intro-purple2)" /></linearGradient></defs>
          <path className="si-swoosh-path" d="M 8 55 C 90 95, 300 95, 460 18" />
          <path className="si-plane" fill="url(#si-swoosh-gradient)" d="M -10 -8 L 15 0 L -10 8 L -3 0 Z" />
        </svg>
      </div>
      <div className="si-tagline">{tagline.map((word, index) => <span style={{ animationDelay: `${1.9 + index * 0.06}s` }} key={word}>{word}</span>)}</div>
    </div>
    <button type="button" className="si-skip" aria-label="דילוג על הפתיח" onClick={finish}>דילוג »</button>
  </div>;
}
