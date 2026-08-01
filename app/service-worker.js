/* VINTAGE PWA Service Worker v3
 * 策略：应用外壳（HTML/CSS/JS）网络优先 —— 保证每次发布都能拿到新版本；
 *       断网时回落缓存。图标等静态资源缓存优先。
 */
const CACHE = 'vintage-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/sync.js',
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
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 应用外壳判定：导航请求与 html/css/js */
function isShell(req, url) {
  if (req.mode === 'navigate') return true;
  return /\.(html|css|js)$/i.test(url.pathname);
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* 云同步接口：永远走网络，不缓存 */
  if (url.pathname.startsWith('/api/')) {
    if (e.request.method !== 'GET' && e.request.method !== 'POST') return;
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ msg: 'offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }
  if (e.request.method !== 'GET') return;

  /* 应用外壳：网络优先 → 成功则回写缓存；失败回落缓存 */
  if (isShell(e.request, url)) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  /* 其它静态资源：缓存优先 */
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
