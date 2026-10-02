const CACHE_NAME = "ost-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "https://cdn.jsdelivr.net/npm/hls.js@latest"
];

// Install: Cache critical static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for dynamic requests, cache-fallback for app shell
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Bypass cache completely for media streams, Google Apps Script, and non-GET calls
  if (
    event.request.method !== "GET" ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".aac") ||
    url.pathname.endsWith(".m3u8") ||
    url.pathname.endsWith(".ts") ||
    url.hostname.includes("script.google.com")
  ) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful external CDNs or dynamic shell resources
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin || url.hostname.includes("cdn.jsdelivr.net"))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for an HTML page, serve root index
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
        });
    })
  );
});