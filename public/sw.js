// Service Worker لتمكين العمل بدون اتصال وتحسين الأداء
const CACHE_NAME = 'mustand-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo-mustand.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});