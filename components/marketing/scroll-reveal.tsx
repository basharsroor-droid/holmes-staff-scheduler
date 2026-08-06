"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function ScrollReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); observer.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -50px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`scroll-reveal ${shown ? "shown" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
