import type { MetadataRoute } from "next";

import { productConfig } from "@/lib/app-config";

// Web app manifest -- Next.js's app/manifest.ts convention serves this at
// /manifest.webmanifest automatically, no separate route needed. This is
// step one of the PWA foundation (roadmap phase 7): makes the site
// installable to a home screen / app drawer. It does not on its own
// change how the app behaves online -- see public/sw.js for the (very
// deliberately conservative) offline behavior.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: productConfig.name,
    short_name: productConfig.shortName,
    description: productConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fb", // matches --bg in app/globals.css
    theme_color: "#2158c9", // matches --primary in app/globals.css
    dir: "rtl",
    lang: "he",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
