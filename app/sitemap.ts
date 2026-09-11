import type { MetadataRoute } from "next";

// H3 in docs/REMEDIATION_PLAN.md: /sitemap.xml was a 404. Lists only the
// public marketing pages; private routes are disallowed in app/robots.ts.
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.shiftpilothq.com").replace(/\/$/, "");

const publicPages: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicPages.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority
  }));
}
