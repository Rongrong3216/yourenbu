// sw.js —— Service Worker，离线缓存（网络优先，保证总是最新代码）

const CACHE = 'yourenbu-v2';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/card-flip.css',
  './css/pin-lock.css',
  './css/print.css',
  './js/utils.js',
  './js/db.js',
  './js/webdav.js',
  './js/sync.js',
  './js/sample-data.js',
  './js/pin.js',
  './js/home.js',
  './js/card.js',
  './js/quick-note.js',
  './js/friend-list.js',
  './js/friend-detail.js',
  './js/friend-form.js',
  './js/moment.js',
  './js/gift.js',
  './js/settings.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('jianguoyun.com')) return;
  // 网络优先：每次都尝试拉最新，离线时才用缓存
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});
