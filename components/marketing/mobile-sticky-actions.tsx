"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

// H4 in docs/REMEDIATION_PLAN.md: on a phone, the sticky "demo / open a
// workspace" bar sat on top of the hero, which already shows exactly those
// two buttons, so the first screen offered the same two actions twice.
// It now appears only once the visitor has scrolled past half a screen,
// where the hero's buttons are gone and a shortcut back to them helps.
//
// Scroll distance, not an IntersectionObserver on the hero buttons: the
// cinematic hero is pinned while it scrolls, so its buttons fade out but
// technically stay in the viewport, and an observer would never fire.
//
// While hidden the bar is aria-hidden and its links leave the tab order,
// so keyboard and screen-reader users never land on invisible controls.
export function MobileStickyActions() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * 0.5);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const tabIndex = visible ? undefined : -1;

  return (
    <div className={`mobile-sticky-actions${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      <Link href="/demo" tabIndex={tabIndex}>דמו</Link>
      <Link href="/onboarding" tabIndex={tabIndex}>פתיחת סביבת עבודה <ArrowLeft size={16} /></Link>
    </div>
  );
}
