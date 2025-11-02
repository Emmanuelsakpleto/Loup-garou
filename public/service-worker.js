// Service Worker pour Loup-Garou PWA
const CACHE_NAME = 'loup-garou-v1';
const RUNTIME_CACHE = 'loup-garou-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter(n => n !== CACHE_NAME && n !== RUNTIME_CACHE).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  if (url.pathname.includes('/api/') || url.pathname.includes('/socket.io/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.status === 200) {
            caches.open(RUNTIME_CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/) || url.hostname.includes('fonts.g') || url.hostname.includes('cdn.tailwind')) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(res => {
          if (res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.status === 200) {
          caches.open(RUNTIME_CACHE).then(c => c.put(request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(request).then(c => c || caches.match('/index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
