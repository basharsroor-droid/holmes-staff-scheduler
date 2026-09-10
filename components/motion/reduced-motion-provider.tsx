"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

// G2 in docs/REMEDIATION_PLAN.md: honour the operating system's "reduce
// motion" setting in every framer-motion component (login, navbar, roles
// showcase, both docks) -- until now only the CSS layers did.
//
// reducedMotion="user" makes framer-motion skip transform and layout
// animations (movement, scaling, the login button's endless shimmer) when
// the viewer has asked for reduced motion, while keeping opacity fades,
// which WCAG 2.3.3 does not treat as motion. Viewers without the setting
// see exactly what they saw before.
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
