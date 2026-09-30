// Kotoba offline cache: serve from cache first, refresh in the background.
// Bump the version to force phones to drop the old copy.
const CACHE = 'kotoba-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => caches.open(CACHE)).then(c => c.delete(new URL('jpphrasebook.html', self.registration.scope).href))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // jpphrasebook.html was folded into the guide's Phrases tab. Send old links and home-screen icons there.
  const url = new URL(e.request.url);
  if (url.origin === location.origin && url.pathname.endsWith('/jpphrasebook.html')) {
    e.respondWith(Response.redirect(new URL('jpguide.html#phrases', url).href, 302));
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
      const network = fetch(e.request)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
