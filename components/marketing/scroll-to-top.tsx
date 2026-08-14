"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Floating "back to top" button -- appears once the visitor has scrolled
// past the Hero, positioned clear of .mobile-sticky-actions (the full-width
// bar pinned to the bottom on mobile).
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="גלילה לראש העמוד"
      className="fixed bottom-[92px] start-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_10px_24px_rgba(33,88,201,0.4)] transition-transform hover:-translate-y-1 hover:bg-[var(--primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:bottom-6 sm:start-6 sm:h-12 sm:w-12"
    >
      <ArrowUp size={18} />
    </button>
  );
}
