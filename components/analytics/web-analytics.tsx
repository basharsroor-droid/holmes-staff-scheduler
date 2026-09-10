"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics, scoped to the public marketing site only.
//
// Why the scoping: the product already has first-party, privacy-reviewed
// analytics for in-app behaviour (public.operational_events -- allow-listed
// event names, internal ids only, no employee names or schedule content; see
// docs/OBSERVABILITY.md). Sending /workspace traffic to a second processor
// would widen the disclosure surface for tenant data with no benefit, since
// that question is already answered in-house.
//
// What was missing is the other half: whether anyone reaches the marketing
// site at all. There was no measurement of /, /pricing or /contact -- see
// docs/REMEDIATION_PLAN.md (H2). That is what this covers, and nothing more.
//
// Vercel Web Analytics is cookieless and sets no cross-site identifier, so
// this does not change the App Privacy "Tracking: No" declaration filed with
// Apple.
const MEASURED_PREFIXES = ["/pricing", "/contact", "/about", "/demo", "/terms", "/privacy"];

function isPublicMarketingRoute(pathname: string) {
  if (pathname === "/") return true;
  return MEASURED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function WebAnalytics() {
  const pathname = usePathname();
  if (!isPublicMarketingRoute(pathname)) return null;
  return <Analytics />;
}
