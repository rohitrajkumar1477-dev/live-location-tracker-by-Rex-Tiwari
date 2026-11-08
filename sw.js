/* Live Location Tracker — service worker: makes the site installable
 * and loads fast offline. It does NOT track location in the background:
 * service workers cannot access GPS. Sharing only works while the page
 * is open. */
var CACHE = 'llt-v3';
// Versioned asset URLs (see index.html ?v=3): the browser treats each
// version as a new file, so an update can never run new HTML with old JS.
var ASSETS = [
  './',
  './index.html',
  './styles.css?v=3',
  './app.js?v=3',
  './firebase-config.js?v=3',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .catch(function () { /* offline first install: skip */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // Only handle same-origin requests; let CDN/Firebase go direct.
  if (url.origin !== location.origin) return;
  e.respondWith(
    // cache:'reload' bypasses the browser's HTTP cache, so an update can
    // never serve a stale copy of a file. Offline: fall back to the cache.
    fetch(e.request, { cache: 'reload' }).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
