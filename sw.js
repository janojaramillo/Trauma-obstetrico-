/* Service worker · Lesión al Nacer (CDSS Trauma Obstétrico Neonatal) · v1.0.0
   Estrategia: precarga de la app y "cache primero con actualización en segundo plano".
   Así abre al instante sin señal y nunca queda colgada esperando la red. */
const CACHE = 'trauma-parto-v1.0.0';
const CORE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('trauma-parto-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // solo lo propio

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = isPage ? './index.html' : req;
    const cached = (await cache.match(key, { ignoreSearch: isPage })) || (isPage ? await cache.match('./') : null);

    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    return new Response('<!doctype html><meta charset="utf-8"><title>Sin conexión</title><body style="font-family:system-ui;background:#14152a;color:#f6ecdc;padding:40px">Sin conexión y sin copia guardada. Abre la app una vez con internet.</body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  })());
});
