
const CACHE_VERSION = 'v4';
const CACHE_NAME = 'meter-lookup-' + CACHE_VERSION;
const ASSETS = [ './', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png' ];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    // Network-first for the app shell
    e.respondWith((async () => {
      try {
        const fresh = await fetch(e.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(e.request, fresh.clone());
        return fresh;
      } catch(err) {
        const cached = await caches.match(e.request);
        return cached || new Response('Offline', {status: 503});
      }
    })());
    return;
  }
  // Cache-first for other assets
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    const fresh = await fetch(e.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(e.request, fresh.clone());
    return fresh;
  })());
});
