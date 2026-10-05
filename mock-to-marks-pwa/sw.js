// ProDJEE — offline app shell for gamified learning and AI score improvement.
// Pages remain network-first. Versioned static assets are cache-first with
// background refresh so large question bundles do not block an installed
// app on every launch. Bumping this cache for every shell release still
// guarantees that a newly activated worker installs the current files and
// discards every older copy before it takes control.
var CACHE_NAME = 'prodjee-cache-v51';
var ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-maskable-192.png', '/icon-maskable-512.png',
  '/assets/pj-core.css', '/assets/pj-core.js', '/assets/pj-analytics.js', '/assets/pj-push.js', '/assets/pj-transition.js', '/assets/subject-chapters.js', '/assets/logo-192.png', '/assets/logo-wordmark-186.png', '/assets/logo-wordmark-106.png', '/m2m/', '/arena/',
  '/arena/styles.css', '/arena/app.js', '/arena/questions.js', '/arena/practice.js', '/arena/pyq.js',
  '/arena/vendor/katex/katex.min.css', '/arena/vendor/katex/katex.min.js', '/arena/vendor/katex/contrib/auto-render.min.js',
  '/coach/', '/coach/app.js', '/news/'];

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
function cacheCopy(req, res) {
  if (!res || res.status !== 200 || res.type !== 'basic') return Promise.resolve();
  var copy = res.clone();
  return caches.open(CACHE_NAME).then(function (c) { return c.put(req, copy); });
}
// Daily-nudge push (sent by api/push.js). The payload is {title, body, url, tag}.
self.addEventListener('push', function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.title || 'ProDJEE', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || 'prodjee-daily',
    data: { url: typeof d.url === 'string' && d.url.charAt(0) === '/' ? d.url : '/arena/' }
  }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/arena/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) { if ('navigate' in list[i]) list[i].navigate(url).catch(function () {}); return list[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
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
  var fresh = fetch(req).then(function (res) { return { response: res, cached: cacheCopy(req, res) }; });
  event.waitUntil(fresh.then(function (result) { return result.cached; }).catch(function () {}));
  event.respondWith(caches.match(req).then(function (cached) {
    if (cached) return cached;
    return fresh.then(function (result) { return result.response; }).catch(function () { return caches.match(req); });
  }));
});
