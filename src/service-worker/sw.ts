/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

// Cleanup old caches automatically
cleanupOutdatedCaches();

// Precache all assets compiled by Vite
precacheAndRoute(self.__WB_MANIFEST);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Cache Bootstrap CSS/JS and external libraries from CDNs
registerRoute(
  ({ url }) =>
    url.origin === "https://cdn.jsdelivr.net" ||
    url.origin === "https://accounts.google.com",
  new StaleWhileRevalidate({
    cacheName: "external-cdns",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Default network-first strategy for direct page navigation to support fresh dynamic updates
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Listen to SKIP_WAITING to allow immediate service worker activation
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
