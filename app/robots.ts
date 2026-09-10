import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/sitemap";

// H3 in docs/REMEDIATION_PLAN.md: /robots.txt was a 404. Public marketing
// pages are crawlable; everything behind a login (the SaaS workspace, the
// support and admin consoles, the legacy demo routes) and every technical
// route is not. Blocking here keeps those pages out of search results; it is
// not access control -- that stays in RLS and the route guards.
const privatePrefixes = [
  "/workspace",
  "/admin",
  "/support",
  "/demo",
  "/pilot",
  "/manager",
  "/manager-requests",
  "/employee",
  "/app",
  "/availability",
  "/my-shifts",
  "/schedule",
  "/swap-requests",
  "/auth",
  "/api",
  "/offline"
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: privatePrefixes }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
