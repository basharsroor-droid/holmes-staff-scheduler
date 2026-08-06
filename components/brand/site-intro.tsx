"use client";

import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";

const INTRO_KEY = "shiftpilot_intro_seen";

export function SiteIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.sessionStorage.getItem(INTRO_KEY)) return;
    setVisible(true);
    window.sessionStorage.setItem(INTRO_KEY, "1");
    const leaveTimer = window.setTimeout(() => setLeaving(true), 2100);
    const hideTimer = window.setTimeout(() => setVisible(false), 2700);
    return () => { window.clearTimeout(leaveTimer); window.clearTimeout(hideTimer); };
  }, []);

  function close() {
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 450);
  }

  if (!visible) return null;

  return <div className={`site-intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label="ShiftPilot">
    <div className="intro-stars" />
    <div className="intro-flight"><i /><i /><i /></div>
    <div className="intro-logo"><BrandLogo light /><p>הדרך הקלה למשמרת הבאה שלך</p></div>
    <button type="button" onClick={close}>דילוג</button>
  </div>;
}
