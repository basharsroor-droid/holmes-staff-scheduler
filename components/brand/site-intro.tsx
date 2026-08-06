"use client";

import { useEffect, useState } from "react";

const INTRO_KEY = "shiftpilot_intro_seen_v3";

export function SiteIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.sessionStorage.getItem(INTRO_KEY)) return;
    setVisible(true);
    window.sessionStorage.setItem(INTRO_KEY, "1");
    const fallback = window.setTimeout(() => close(), 12000);
    return () => window.clearTimeout(fallback);
  }, []);

  function close() {
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 550);
  }

  if (!visible) return null;

  return <div className={`site-intro video-intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label="פתיח ShiftPilot">
    <video autoPlay muted playsInline preload="auto" onEnded={close}>
      <source media="(max-width: 760px)" src="/shiftpilot-intro-mobile.mp4" type="video/mp4" />
      <source src="/shiftpilot-intro.mp4" type="video/mp4" />
    </video>
    <button type="button" onClick={close}>דילוג על הפתיח</button>
  </div>;
}
