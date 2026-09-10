/* Scoped to Image Compressor. Only public application assets are cached. */
const PREFIX = 'gat-image-compressor-';
const ROUTE = '/tools/image-compressor';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'prepare' || !event.ports[0]) return;
  event.waitUntil((async () => {
    let cacheName;
    try {
      const response = await fetch('/tools/image-compressor/offline-assets.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Offline assets are not prepared for this production build. Run the documented postbuild step.');
      const manifest = await response.json();
      if (!Array.isArray(manifest.assets) || !/^[a-zA-Z0-9_-]+$/.test(manifest.build)) throw new Error('Invalid offline asset manifest.');
      cacheName = PREFIX + manifest.build;
      const cache = await caches.open(cacheName);
      const paths = [...new Set([...manifest.assets, ROUTE])];
      if (paths.length > 1000) throw new Error('Offline asset list exceeds its limit.');
      let total = 0;
      for (const pathname of paths) {
        if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('..') || !(pathname === ROUTE || pathname.startsWith('/_next/static/') || pathname.startsWith('/tools/image-compressor/'))) throw new Error('Invalid offline asset path.');
        const request = new Request(new URL(pathname, self.location.origin), { credentials: 'same-origin' });
        const asset = await fetch(request, { cache: 'reload' });
        if (!asset.ok || asset.redirected || asset.type === 'opaque') throw new Error(`Could not cache ${pathname}.`);
        const body = await asset.blob(); total += body.size;
        if (total > 96 * 1024 * 1024) throw new Error('Offline assets exceed the 96 MiB cache budget.');
        await cache.put(request, new Response(body, { status: asset.status, statusText: asset.statusText, headers: asset.headers }));
      }
      // Mark complete only after every required asset succeeds. Old usable caches survive failures.
      await cache.put('/tools/image-compressor/__ready', new Response('ready'));
      for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== cacheName) await caches.delete(key);
      event.ports[0].postMessage({ ok: true });
    } catch (error) {
      if (cacheName) { const cache = await caches.open(cacheName); if (!(await cache.match('/tools/image-compressor/__ready'))) await caches.delete(cacheName); }
      event.ports[0].postMessage({ ok: false, error: error instanceof Error ? error.message : 'Offline preparation failed.' });
    }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigation = request.mode === 'navigate' && (url.pathname === ROUTE || url.pathname === ROUTE + '/');
  const asset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/tools/image-compressor/v1/');
  if (!navigation && !asset) return;
  event.respondWith((async () => {
    const names = (await caches.keys()).filter(key => key.startsWith(PREFIX));
    const cached = async () => {
      for (const name of names) {
        const cache = await caches.open(name);
        if (await cache.match('/tools/image-compressor/__ready')) { const value = await cache.match(navigation ? ROUTE : request); if (value) return value; }
      }
    };
    if (asset) { const response = await cached(); if (response) return response; }
    try { return await fetch(request); }
    catch (error) { const response = await cached(); if (response) return response; throw error; }
  })());
});
