// ProDJEE — offline app shell for the hub, Arena and Mock-to-Marks.
// Everything same-origin is network-first, cache only as an offline
// fallback. Static JS/CSS used to be cache-first (serve the cached copy
// immediately, refresh in the background for *next* load) - that meant a
// code fix, including a security fix, wouldn't actually reach an
// already-installed user's screen until their *second* load after a
// deploy, even on a hard refresh, since the browser's hard-refresh cache
// bypass doesn't touch the service worker's own Cache Storage.
var CACHE_NAME = 'prodjee-cache-v12';
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
  event.respondWith(fetch(req).then(function (res) { return saveCopy(req, res); })
    .catch(function () { return caches.match(req); }));
});
