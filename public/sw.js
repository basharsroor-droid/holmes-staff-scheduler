// ShiftPilot service worker -- PWA foundation, step one of roadmap phase 7.
//
// Deliberately conservative. This app shows live scheduling data (shift
// assignments, swap requests, notifications) that must never be served
// stale from a cache -- an out-of-date schedule is worse than no
// offline support at all. So the only things this worker ever caches
// are Next.js's content-hashed static assets (safe to cache forever,
// a new deploy gets new hashed filenames automatically) and the app
// icons. Everything else -- page navigations, /api/*, RSC data
// fetches -- goes straight to the network. The one offline behavior
// this adds is a friendly fallback page instead of the browser's own
// "no internet" error when a navigation truly can't reach the server.
//
// Bump CACHE_VERSION on any change to this file's caching behavior so
// old caches get cleaned up on the next activate.
const CACHE_VERSION = "v1";
const STATIC_CACHE = `shiftpilot-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isImmutableStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutations

  const url = new URL(request.url);

  // Content-hashed static assets: cache-first, safe because a new
  // deploy always ships new filenames.
  if (isImmutableStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Page navigations: always try the network first (never show a
  // stale cached page -- this is a live scheduling app). Only fall
  // back to the offline page when the network genuinely fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()))
    );
    return;
  }

  // Everything else (API routes, RSC payloads, cross-origin requests):
  // network-only, no interception. Data correctness over offline
  // support for anything dynamic.
});
