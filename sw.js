// Keeps the app itself available offline. Exchange rates are not cached here;
// the page stores the last downloaded rates in localStorage.
var CACHE = "vnfx-v15";
var SHELL = ["./", "index.html", "manifest.webmanifest?v=3", "icon-180-v3.png", "icon-192-v3.png", "icon-512-v3.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  // Network first so updates arrive when online; fall back to cache when offline.
  // Own files skip the browser's 10-minute HTTP cache so a new version shows on the next open.
  e.respondWith(
    fetch(sameOrigin ? new Request(req.url, { cache: "no-cache" }) : req).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        return req.mode === "navigate" ? caches.match("index.html") : Response.error();
      });
    })
  );
});
