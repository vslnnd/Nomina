// Basic service worker to enable PWA installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Standard fetch pass-through
  event.respondWith(fetch(event.request));
});