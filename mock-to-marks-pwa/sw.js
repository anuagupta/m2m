// ProDJEE — offline app shell for the hub, Arena and Mock-to-Marks.
// Pages are network-first (so updates reach students immediately and old
// Mock-to-Marks installs pick up the new hub); static files are cache-first.
var CACHE_NAME = 'prodjee-cache-v11';
var ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png',
  '/assets/pj-core.css', '/assets/pj-core.js', '/assets/logo-192.png', '/m2m/', '/arena/'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(ASSETS); }).catch(function () {}));
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
function saveCopy(req, res) {
  if (res && res.status === 200 && res.type === 'basic') { var copy = res.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/_vercel/') === 0) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(function (res) { return saveCopy(req, res); })
      .catch(function () { return caches.match(req).then(function (c) { return c || caches.match('/'); }); }));
    return;
  }
  event.respondWith(caches.match(req).then(function (cached) {
    var net = fetch(req).then(function (res) { return saveCopy(req, res); });
    return cached || net;
  }));
});
