// deploy.yml stamps the commit into CACHE_NAME, so every deploy ships a new sw.js.
const CACHE_NAME = 'dynameowte-v1';

// The app shell is fetched from the network first so updates show up when online.
// The cache is only the offline fallback. GitHub Pages sends max-age=600, so revalidate.
const CORE_FILES = new Set(['', 'index.html', 'manifest.json']);

const ALL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ALL_ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const filename = url.pathname.split('/').pop();
  const isCore = event.request.mode === 'navigate' || CORE_FILES.has(filename);

  if (isCore) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // Icons rarely change, so cache-first is fine for them.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }))
  );
});
