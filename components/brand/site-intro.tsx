"use client";

import { useEffect, useRef, useState } from "react";

const INTRO_KEY = "shiftpilot_code_intro_seen_v1";
const tagline = "THE EASY WAY TO YOUR NEXT SHIFT".split(" ");

export function SiteIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.sessionStorage.getItem(INTRO_KEY)) return;
    document.documentElement.classList.add("si-lock");
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
  }, [visible]);

  function finish() {
    if (leaving) return;
    setLeaving(true);
    window.sessionStorage.setItem(INTRO_KEY, "1");
    window.setTimeout(() => {
      document.documentElement.classList.remove("si-lock");
      setVisible(false);
    }, 650);
  }

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
