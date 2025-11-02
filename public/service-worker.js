// Service worker basique — cache assets statiques et stratégie réseau-first pour les ressources API
const CACHE_NAME = 'loup-garou-static-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Bypass non-GET requests
  if (request.method !== 'GET') return;

  // Network-first for API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for navigation and static assets
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, res.clone());
        return res;
      });
    }))
  );
});
