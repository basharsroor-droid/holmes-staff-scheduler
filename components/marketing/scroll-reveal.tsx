"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type ScrollRevealProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
  delay?: number;
};

export function ScrollReveal({ children, className = "", delay = 0, ...props }: ScrollRevealProps) {
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

  return <div {...props} ref={ref} className={`scroll-reveal ${shown ? "shown" : ""} ${className}`} style={{ ...props.style, transitionDelay: `${delay}ms` }}>{children}</div>;
}
