const CACHE_NAME = 'vipclub-static-v3';
const STATIC_ASSETS = [
  './manifest.webmanifest',
  './logo.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.endsWith('.json')) return; // Gästeliste immer aktuell vom Server laden.

  // index.html (bzw. der Navigations-Request der App-Startseite) wird NIE aus dem Cache
  // ausgeliefert, sondern immer frisch vom Server geholt (network-first, kein Fallback-Cache-Rückgriff
  // für den Erstladevorgang), damit auch die installierte Home-Screen-PWA bei jedem Öffnen
  // garantiert die aktuelle Version inkl. Auto-Load der Gästeliste bekommt.
  const isAppShell = request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/');

  if (isAppShell) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
