// Minimal read-only offline cache for the wiki.
//
// Network-first for HTML so signed-in users always see fresh content when
// online; cache-fallback so the last-visited pages stay readable offline.
// Cache-first for /_next/static/* and brand assets (they're immutable per
// build hash, so cache hits are correct).
//
// All POST / route-handler / auth-cookie paths are intentionally NOT cached.

const CACHE = "bya-wiki-v1";
const APP_SHELL = ["/", "/icon.svg", "/apple-touch-icon.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // addAll() rejects the whole batch if any single fetch fails; tolerate
        // misses individually so a 404 doesn't block install.
        Promise.all(
          APP_SHELL.map((url) =>
            fetch(url, { credentials: "include" })
              .then((resp) => (resp.ok ? cache.put(url, resp.clone()) : null))
              .catch(() => null),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip server actions, route handlers, dev tools, and Next RSC payloads —
  // these need fresh auth context every time.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.startsWith("/_next/static/development/") ||
    url.pathname === "/sign-out" ||
    url.pathname === "/login" ||
    url.pathname === "/set-password"
  ) {
    return;
  }

  // Cache-first for immutable static assets.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/apple-touch-icon") ||
    url.pathname.startsWith("/bya-logo")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copy = resp.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return resp;
          }),
      ),
    );
    return;
  }

  // Network-first for HTML navigations; fall back to cache when offline.
  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
        .catch(() =>
          caches
            .match(req)
            .then(
              (m) =>
                m ||
                caches.match("/") ||
                new Response("Offline", { status: 503 }),
            ),
        ),
    );
  }
});
