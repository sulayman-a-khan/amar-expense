// Minimal service worker.
//
// Chrome's PWA installability check requires an active service worker
// with a `fetch` event handler — without one, "Add to Home Screen" just
// creates a bookmark-style shortcut instead of a real standalone app.
//
// This intentionally does NOT cache anything (the app talks to a live
// API and should always fetch fresh data). It exists purely to satisfy
// the installability requirement, plus give a small offline fallback
// for the app shell.

const CACHE_NAME = 'amar-hishab-shell-v1';
const SHELL_URL = '/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle top-level navigations; let everything else (API calls,
  // Next.js assets, images) go straight to the network as normal.
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(SHELL_URL).then((res) => res || Response.error())
    )
  );
});
