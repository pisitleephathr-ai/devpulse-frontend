/*
 * DevPulse service worker — intentionally minimal and defensive.
 *
 * Goal: make the app installable (Chrome requires a fetch handler) and give a
 * friendly offline page — WITHOUT ever serving stale build assets, which is the
 * classic PWA footgun. So:
 *   - We precache ONLY the offline fallback page.
 *   - Cross-origin requests (the API on Railway) are never touched.
 *   - Same-origin non-navigation GETs (Next's hashed JS/CSS) pass straight
 *     through to the network — always fresh, no cache.
 *   - Navigations are network-first; the cached offline page shows only when
 *     the network is unreachable.
 */
const CACHE = "devpulse-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add(OFFLINE_URL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any old shell caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin — never intercept API / third-party calls.
  if (url.origin !== self.location.origin) return;

  // Network-first for page navigations; fall back to the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline || Response.error();
        }
      })()
    );
  }
  // Everything else: default network handling (no caching → no staleness).
});
