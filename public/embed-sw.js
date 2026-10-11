/* eslint-disable @typescript-eslint/no-unused-vars */
/* Kostenplan embed-cache. Bewaart de laatst geopende rekentool in de browser van de bezoeker,
   zodat een terugkerende bezoeker hem ook ziet als onze server niet bereikbaar is.
   Alleen GET-verzoeken onder /embed/ en de bijbehorende bestanden; formulierverzendingen
   (POST) gaan altijd gewoon naar het netwerk. */
var CACHE = "kp-embed-v1";
var NAV_WACHT = 3000;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(
        namen.filter(function (n) { return n.indexOf("kp-embed-") === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); })
      ).then(function () { return self.clients.claim(); });
    })
  );
});

function bewaar(request, response) {
  if (!response || !response.ok) return response;
  var kopie = response.clone();
  caches.open(CACHE).then(function (c) { return c.put(request, kopie); })["catch"](function () {});
  return response;
}

// Netwerk eerst (maximaal NAV_WACHT ms), anders de bewaarde kopie.
function netwerkEerst(request) {
  var cached = caches.match(request);
  return new Promise(function (resolve) {
    var klaar = false;
    var timer = setTimeout(function () {
      cached.then(function (c) { if (c && !klaar) { klaar = true; resolve(c); } });
    }, NAV_WACHT);
    fetch(request).then(
      function (res) {
        if (res.ok) { clearTimeout(timer); if (!klaar) { klaar = true; resolve(bewaar(request, res)); } }
        else { clearTimeout(timer); cached.then(function (c) { if (!klaar) { klaar = true; resolve(c || res); } }); }
      },
      function (err) {
        clearTimeout(timer);
        cached.then(function (c) { if (!klaar) { klaar = true; if (c) resolve(c); else resolve(Response.error()); } });
      }
    );
  });
}

// Onveranderlijke bestanden: bewaard exemplaar eerst.
function cacheEerst(request) {
  return caches.match(request).then(function (c) {
    if (c) return c;
    return fetch(request).then(function (res) { return bewaar(request, res); });
  });
}

// De pagina vraagt zichzelf en de bestanden die ze al gebruikte te bewaren: bij
// het allereerste bezoek werd de service worker pas actief ná het laden.
self.addEventListener("message", function (event) {
  var d = event.data;
  if (!d || d.type !== "bewaar" || !Array.isArray(d.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(
        d.urls.slice(0, 80).map(function (u) {
          var url = new URL(u, self.location.href);
          if (url.origin !== self.location.origin) return null;
          if (url.pathname.indexOf("/embed/") !== 0 && url.pathname.indexOf("/_next/static/") !== 0 && url.pathname.indexOf("/kp/") !== 0) return null;
          return fetch(url.href, { credentials: "same-origin" }).then(function (res) { if (res.ok) return c.put(url.href, res); })["catch"](function () {});
        })
      );
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/embed/") === 0 && request.mode === "navigate") {
    event.respondWith(netwerkEerst(request));
  } else if (url.pathname.indexOf("/_next/static/") === 0 || url.pathname.indexOf("/kp/") === 0) {
    event.respondWith(cacheEerst(request));
  }
});
