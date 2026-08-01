/* VINTAGE PWA Service Worker：离线缓存应用外壳 */
const CACHE = 'vintage-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/store.js',
  './js/fx.js',
  './js/views.js',
  './js/views2.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  /* 云同步接口：永远走网络，不缓存 */
  if (url.pathname.startsWith('/api/')) {
    if (e.request.method !== 'GET' && e.request.method !== 'POST') return;
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ msg: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r =>
      r || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
