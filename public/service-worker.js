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

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  if (url.pathname.includes('/api/') || url.pathname.includes('/socket.io/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (STATIC_ASSET_REGEX.test(url.pathname) || isExternalAssetHost(url.hostname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  event.respondWith(networkFallbackToCache(request));
});

const STATIC_ASSET_REGEX = /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/i;

function isExternalAssetHost(hostname) {
  return hostname.includes('fonts.g') || hostname.includes('cdn.tailwind');
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const networkResponse = await fetch(request);
  if (shouldCacheResponse(networkResponse)) {
    const cache = await caches.open(cacheName);
    await cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (shouldCacheResponse(networkResponse)) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function networkFallbackToCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (shouldCacheResponse(networkResponse)) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return caches.match('/index.html');
  }
}

function shouldCacheResponse(response) {
  if (!response || response.status !== 200) {
    return false;
  }

  return response.type === 'basic' || response.type === 'cors';
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
