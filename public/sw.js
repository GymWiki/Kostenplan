/* eslint-disable @typescript-eslint/no-unused-vars */
/* Kostenplan app-schil: alleen statische bestanden worden bewaard, nooit pagina's of gegevens
   (die bevatten klantgegevens). Zonder verbinding krijg je een nette offline-pagina.
   Daarnaast: meldingen (Web Push) bij een nieuwe aanvraag. */
var CACHE = "kp-app-v1";
var OFFLINE = "/offline.html";

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll([OFFLINE, "/icons/icon-192.png"]); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.filter(function (n) { return n.indexOf("kp-app-") === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0 || url.pathname.indexOf("/embed") === 0 || url.pathname.indexOf("/kp/") === 0) return;

  if (request.mode === "navigate") {
    // Alleen voor het dashboard: bij geen verbinding de offline-pagina; verder gewoon netwerk.
    if (url.pathname.indexOf("/dashboard") !== 0) return;
    event.respondWith(fetch(request).catch(function () { return caches.match(OFFLINE); }));
    return;
  }
  if (url.pathname.indexOf("/_next/static/") === 0 || url.pathname.indexOf("/icons/") === 0) {
    event.respondWith(
      caches.match(request).then(function (c) {
        return c || fetch(request).then(function (res) {
          if (res.ok) { var kopie = res.clone(); caches.open(CACHE).then(function (cache) { cache.put(request, kopie); }); }
          return res;
        });
      })
    );
  }
});

self.addEventListener("push", function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { titel: "Kostenplan", tekst: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(d.titel || "Kostenplan", {
      body: d.tekst || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: d.url || "/dashboard/leads" },
      tag: "kp-lead"
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var doel = (event.notification.data && event.notification.data.url) || "/dashboard/leads";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (lijst) {
      for (var i = 0; i < lijst.length; i++) {
        var c = lijst[i];
        if ("focus" in c) { c.navigate(doel); return c.focus(); }
      }
      return self.clients.openWindow(doel);
    })
  );
});
