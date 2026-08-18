/* ASCII Ski SW (scope: ./) */
const CACHE = 'ski-v1';
const ASSETS = [
  './',
  './index.html',
  './impressum.html',
  './impressum',
  './datenschutz.html',
  './datenschutz',
  './404.html',
  './ski.css',
  './ski.js',
  './manifest.webmanifest',
  './fonts/vt323-latin.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map((url) => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function urlCandidates(requestUrl) {
  const url = new URL(requestUrl, self.location.origin);
  const path = url.pathname;
  const candidates = new Set([url.href, path]);
  if (path.endsWith('.html')) {
    const clean = path.replace(/\.html$/, '') || '/';
    candidates.add(clean);
    candidates.add(new URL(clean, url.origin).href);
  } else if (path.endsWith('/')) {
    candidates.add(path + 'index.html');
  } else {
    candidates.add(path + '.html');
    candidates.add(new URL(path + '.html', url.origin).href);
  }
  if (path === '/' || path === '') {
    candidates.add('/index.html');
    candidates.add(new URL('./index.html', self.registration.scope).href);
  }
  return [...candidates];
}

async function matchCached(request) {
  const cache = await caches.open(CACHE);
  const direct = await cache.match(request, { ignoreSearch: true });
  if (direct) return direct;
  for (const candidate of urlCandidates(request.url)) {
    const hit = await cache.match(candidate, { ignoreSearch: true });
    if (hit) return hit;
  }
  return null;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
        return res;
      } catch {
        return (await matchCached(req))
          || (await matchCached(new Request('./index.html')))
          || (await matchCached(new Request('./404.html')));
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await matchCached(req);
    if (cached) return cached;
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  })());
});
