/* eslint-disable @typescript-eslint/no-unused-vars */
/* Kostenplan rekentool-loader, versie 2. Onveranderlijk bestand: wijzigingen komen in v3.js.
   Nieuw t.o.v. v1: knop met pop-up, weergave en onderdelen per plek, deep link, en het melden van het zichtbare deel van de iframe. */
(function (w, d) {
  "use strict";
  if (w.__kostenplanLoader2) {
    try { w.__kostenplanLoader2(); } catch (e) {}
    return;
  }
  var WACHT = 4000; // ms tot de rekentool "klaar" moet melden
  var BEWAAR_DAGEN = 30;
  var SLEUTEL = "kp:v2:";
  var Z = 2147483000;

  function lees(el, naam) {
    var v = el.getAttribute("data-" + naam);
    return v ? v : "";
  }
  function el(tag, stijl, tekst) {
    var e = d.createElement(tag);
    if (stijl) e.style.cssText = stijl;
    if (tekst) e.textContent = tekst;
    return e;
  }
  function veilig(f) {
    return function () {
      try { return f.apply(this, arguments); } catch (e) { /* nooit een fout naar de site van de hovenier */ }
    };
  }
  function opslaanLezen(sleutel, waarde) {
    try {
      if (waarde === undefined) {
        var ruw = w.localStorage.getItem(SLEUTEL + sleutel);
        if (!ruw) return null;
        var o = JSON.parse(ruw);
        if (!o || !o.t || Date.now() - o.t > BEWAAR_DAGEN * 86400000) return null;
        return o.c;
      }
      w.localStorage.setItem(SLEUTEL + sleutel, JSON.stringify({ t: Date.now(), c: waarde }));
    } catch (e) { /* opslag geblokkeerd of vol: dan zonder */ }
    return null;
  }
  function kleurOk(k) {
    return /^#[0-9a-fA-F]{6}$/.test(k || "") ? k : "";
  }
  // Leesbare tekstkleur op een gegeven achtergrond.
  function tekstOp(hex) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
  }
  function telSchoon(t) {
    return String(t || "").replace(/[^0-9+]/g, "");
  }
  function kies(waarde, toegestaan) {
    return toegestaan.indexOf(waarde) >= 0 ? waarde : "";
  }

  // Een deep link op de site van de hovenier: ?kp=schutting of #schutting (alleen letters, cijfers en streepjes).
  function deepLink() {
    try {
      var q = /[?&]kp=([A-Za-z0-9_-]{1,60})(?:&|#|$)/.exec(w.location.search);
      if (q) return q[1];
      var h = /^#([A-Za-z0-9_-]{1,60})$/.exec(w.location.hash);
      if (h) return h[1];
    } catch (e) {}
    return "";
  }

  function init(c) {
    if (c.__kp2) return;
    c.__kp2 = 1;
    var toolId = lees(c, "kostenplan");
    var app = lees(c, "app").replace(/\/$/, "");
    if (!toolId || !app) return;
    // Alles wat het kleine inline-script al neerzette (noodkaart) maakt plaats.
    while (c.firstChild) c.removeChild(c.firstChild);
    var plaatsing = kies(lees(c, "plaatsing"), ["inline", "popup"]) || "inline";
    var popup = plaatsing === "popup";
    var minHoogte = parseInt(lees(c, "hoogte"), 10) || (popup ? 0 : 600);
    var radius = lees(c, "radius");
    var stand = { klaar: false, fout: false, kaart: false };

    var contactAttr = {
      naam: lees(c, "naam"),
      tel: lees(c, "tel"),
      mail: lees(c, "mail"),
      wa: lees(c, "wa"),
      kleur: kleurOk(lees(c, "kleur")),
      bg: kleurOk(lees(c, "bg"))
    };

    // Het adres van de rekentool in de iframe: weergave, onderdelen en deep link gaan als parameters mee.
    function bouwBron(openSleutel, inPopup) {
      var delen = [];
      var weergave = kies(lees(c, "weergave"), ["tegels", "stappen", "lijst"]);
      if (weergave) delen.push("weergave=" + weergave);
      var onderdelen = lees(c, "onderdelen");
      if (/^[A-Za-z0-9_,-]{1,2000}$/.test(onderdelen)) delen.push("onderdelen=" + encodeURIComponent(onderdelen));
      var open = openSleutel || deepLink();
      if (open) delen.push("open=" + encodeURIComponent(open));
      if (inPopup) delen.push("modus=popup");
      return app + "/embed/" + encodeURIComponent(toolId) + (delen.length ? "?" + delen.join("&") : "");
    }

    var bouwKaart = veilig(function (contact, doel, hoogte) {
      var kleur = kleurOk(contact.kleur) || "#15803d";
      var bg = kleurOk(contact.bg) || "#f7faf8";
      var tel = telSchoon(contact.tel);
      var mail = String(contact.mail || "");
      var wa = telSchoon(contact.wa).replace(/^\+/, "");
      var heeftContact = Boolean(tel || mail);
      var kaart = el("div",
        "box-sizing:border-box;min-height:" + hoogte + "px;display:flex;align-items:center;justify-content:center;padding:24px;background:" +
        bg + ";color:#111827;font-family:system-ui,-apple-system,Segoe UI,sans-serif;border-radius:" + (radius ? radius + "px" : "12px"));
      var binnen = el("div", "max-width:420px;width:100%;text-align:center");
      if (!heeftContact) {
        binnen.appendChild(el("p", "margin:0;font-size:16px;font-weight:600", "Deze rekentool is tijdelijk niet beschikbaar."));
        binnen.appendChild(el("p", "margin:8px 0 0;font-size:14px;color:#4b5563", "Probeer het later nog eens."));
      } else {
        binnen.appendChild(el("p", "margin:0;font-size:20px;font-weight:700;line-height:1.3", "Bereken je prijs telefonisch of per mail"));
        if (contact.naam) binnen.appendChild(el("p", "margin:8px 0 0;font-size:14px;color:#4b5563", contact.naam + " helpt je graag verder."));
        var rij = el("div", "display:flex;flex-direction:column;gap:10px;margin-top:20px");
        var knop = function (href, tekst, vol) {
          var a = el("a",
            "display:block;box-sizing:border-box;padding:14px 18px;min-height:48px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;" +
            (vol ? "background:" + kleur + ";color:" + tekstOp(kleur) + ";border:2px solid " + kleur : "background:#fff;color:#111827;border:2px solid " + kleur), tekst);
          a.href = href;
          return a;
        };
        if (tel) rij.appendChild(knop("tel:" + tel, "Bel " + (contact.tel || ""), true));
        if (mail) rij.appendChild(knop("mailto:" + mail + "?subject=" + encodeURIComponent("Prijsaanvraag"), "Mail ons", !tel));
        if (wa) rij.appendChild(knop("https://wa.me/" + wa, "WhatsApp", false));
        binnen.appendChild(rij);
      }
      kaart.appendChild(binnen);
      doel.appendChild(kaart);
      return kaart;
    });

    // Contactgegevens voor de kaart: eerst wat er op de pagina staat, daarna (asynchroon) de nieuwste uit de gepubliceerde kopie of uit de browser.
    var haalContact = veilig(function (toon) {
      var bewaard = opslaanLezen(toolId);
      var start = contactAttr.tel || contactAttr.mail ? contactAttr : bewaard || contactAttr;
      var kaartEl = toon(start);
      var snap = lees(c, "snap").replace(/\/$/, "");
      if (!snap || !w.fetch) return;
      var ctl = w.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 2500);
      w.fetch(snap + "/s/" + encodeURIComponent(toolId) + "/latest.json", { signal: ctl ? ctl.signal : undefined, cache: "default" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(veilig(function (s) {
          clearTimeout(timer);
          if (!s || !s.bedrijf || stand.klaar) return;
          var br = s.branding || {};
          var vers = {
            naam: s.bedrijf.naam || start.naam,
            tel: s.bedrijf.telefoon || start.tel,
            mail: s.bedrijf.email || start.mail,
            wa: start.wa,
            kleur: br.primaireKleur || start.kleur,
            bg: br.achtergrondKleur || start.bg
          };
          if (vers.tel || vers.mail) {
            opslaanLezen(toolId, vers);
            toon(vers, kaartEl);
          }
        }))
        ["catch"](function () { clearTimeout(timer); });
    });

    function opMelding(frame, f) {
      w.addEventListener("message", veilig(function (e) {
        if (e.source !== frame.contentWindow) return;
        var m = e.data;
        if (!m || typeof m !== "object" || m.toolId !== toolId) return;
        f(m);
      }));
    }

    if (popup) {
      startPopup();
    } else {
      startInline();
    }

    /* ---------------------------------------------------------------- inline ---- */
    function startInline() {
      c.style.position = "relative";
      c.style.minHeight = minHoogte + "px";
      if (!c.style.width) c.style.width = "100%";

      // Skeleton met vaste afmetingen: de plek is gereserveerd, dus niets verspringt.
      var skel = el("div", "position:absolute;top:0;left:0;right:0;bottom:0;padding:24px;box-sizing:border-box;background:#f7faf8;border-radius:" + (radius ? radius + "px" : "12px") + ";overflow:hidden");
      skel.setAttribute("aria-hidden", "true");
      var balkStijl = "height:16px;border-radius:8px;background:#e5e7eb;margin-bottom:14px;";
      var delen = [["55%", "28px"], ["90%", ""], ["75%", ""], ["100%", "56px"], ["100%", "56px"], ["100%", "56px"]];
      for (var i = 0; i < delen.length; i++) {
        skel.appendChild(el("div", balkStijl + "width:" + delen[i][0] + (delen[i][1] ? ";height:" + delen[i][1] : "")));
      }
      c.setAttribute("aria-busy", "true");

      var frame = d.createElement("iframe");
      frame.title = "Rekentool" + (contactAttr.naam ? " " + contactAttr.naam : "");
      frame.setAttribute("allowtransparency", lees(c, "transparant") === "1" ? "true" : "false");
      frame.style.cssText =
        "display:block;width:100%;border:0;opacity:0;position:relative;height:" + minHoogte + "px;" +
        (radius ? "border-radius:" + radius + "px;" : "");
      var kaartEl = null;

      function verbergSkelet() {
        if (skel.parentNode) skel.parentNode.removeChild(skel);
        c.removeAttribute("aria-busy");
      }
      function toonRekentool() {
        stand.klaar = true;
        stand.fout = false;
        if (kaartEl && kaartEl.parentNode) kaartEl.parentNode.removeChild(kaartEl);
        kaartEl = null;
        stand.kaart = false;
        verbergSkelet();
        frame.style.opacity = "1";
        frame.style.display = "block";
        opslaanLezen(toolId, contactAttr);
        meldZichtbaar();
      }
      var toonKaart = veilig(function () {
        if (stand.klaar || stand.kaart) return;
        stand.kaart = true;
        verbergSkelet();
        frame.style.display = "none";
        haalContact(function (contact, oud) {
          if (oud && oud.parentNode) oud.parentNode.removeChild(oud);
          kaartEl = bouwKaart(contact, c, minHoogte);
          return kaartEl;
        });
      });

      // Het deel van de iframe dat de bezoeker ziet, zodat vaste balken en vensters in de rekentool daar blijven.
      var zichtTimer = 0;
      var meldZichtbaar = veilig(function () {
        if (!frame.contentWindow || !stand.klaar) return;
        var r = frame.getBoundingClientRect();
        var top = Math.max(0, -r.top);
        var onder = Math.min(r.height, w.innerHeight - r.top);
        frame.contentWindow.postMessage({ type: "kostenplan:zichtbaar", toolId: toolId, top: Math.round(top), height: Math.max(0, Math.round(onder - top)) }, "*");
      });
      var plan = function () {
        if (zichtTimer) return;
        zichtTimer = w.requestAnimationFrame ? w.requestAnimationFrame(function () { zichtTimer = 0; meldZichtbaar(); }) : setTimeout(function () { zichtTimer = 0; meldZichtbaar(); }, 16);
      };
      w.addEventListener("scroll", veilig(plan), { passive: true });
      w.addEventListener("resize", veilig(plan));

      c.appendChild(skel);
      c.appendChild(frame);

      var wachtTimer = null;
      opMelding(frame, function (m) {
        if (m.type === "kostenplan:klaar") {
          clearTimeout(wachtTimer);
          toonRekentool();
        } else if (m.type === "kostenplan:resize" && typeof m.height === "number") {
          clearTimeout(wachtTimer);
          if (!stand.klaar) toonRekentool();
          frame.style.height = Math.max(m.height, minHoogte) + "px";
          plan();
        } else if (m.type === "kostenplan:fout") {
          clearTimeout(wachtTimer);
          stand.fout = true;
          toonKaart();
        } else if (m.type === "kostenplan:vraag-zichtbaar") {
          meldZichtbaar();
        }
      });

      // Pas laden als de rekentool bijna in beeld komt: de site van de hovenier wordt er niet trager van.
      var begonnen = false;
      var begin = veilig(function () {
        if (begonnen) return;
        begonnen = true;
        frame.src = bouwBron("", false);
        wachtTimer = setTimeout(veilig(function () { if (!stand.klaar) toonKaart(); }), WACHT);
      });
      if (w.IntersectionObserver) {
        var io = new IntersectionObserver(veilig(function (items) {
          for (var j = 0; j < items.length; j++) {
            if (items[j].isIntersecting) {
              io.disconnect();
              begin();
              return;
            }
          }
        }), { rootMargin: "400px 0px" });
        io.observe(c);
      } else {
        begin();
      }
    }

    /* ----------------------------------------------------------------- popup ---- */
    function startPopup() {
      var kleur = kleurOk(contactAttr.kleur) || "#15803d";
      var positie = kies(lees(c, "positie"), ["rechtsonder", "linksonder", "inline"]) || "rechtsonder";
      var tekst = lees(c, "knop") || "Bereken je prijs";
      var vast = positie !== "inline";

      var knop = el("button",
        "all:initial;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;cursor:pointer;" +
        "font:600 16px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;background:" + kleur + ";color:" + tekstOp(kleur) + ";border:0;border-radius:" + (radius ? radius + "px" : "10px") + ";" +
        "box-shadow:0 4px 14px rgba(0,0,0,.25);" +
        (vast ? "position:fixed;bottom:max(16px,env(safe-area-inset-bottom));" + (positie === "linksonder" ? "left" : "right") + ":16px;z-index:" + Z + ";" : ""),
        tekst);
      knop.type = "button";
      knop.setAttribute("aria-haspopup", "dialog");
      knop.setAttribute("aria-expanded", "false");
      // Knop en venster staan in een Shadow DOM: de CSS van de site van de hovenier kan ze niet verstoren.
      var knopWortel = c.attachShadow ? c.attachShadow({ mode: "open" }) : c;
      knopWortel.appendChild(knop);
      var venstergastheer = el("div");
      var vensterWortel = venstergastheer.attachShadow ? venstergastheer.attachShadow({ mode: "open" }) : venstergastheer;

      var venster = null, frame = null, sluitKnop = null, achtergrond = null, ladenEl = null, kaartEl = null;
      var open = false, vorigeFocus = null, historyBezet = false, geblokkeerd = [], oudeBody = null, wachtTimer = null, geladen = false;
      var historyId = "kp" + Math.random().toString(36).slice(2, 8);

      function smal() { return w.innerWidth <= 640; }

      function bouwVenster() {
        achtergrond = el("div", "position:fixed;top:0;right:0;bottom:0;left:0;z-index:" + Z + ";background:rgba(17,24,39,.55);display:flex;align-items:" + (smal() ? "stretch" : "center") + ";justify-content:center;");
        achtergrond.setAttribute("data-kostenplan-popup", toolId);
        venster = el("div",
          "position:relative;box-sizing:border-box;background:#fff;display:flex;flex-direction:column;overflow:hidden;" +
          (smal() ? "width:100%;height:100%;border-radius:0;" : "width:min(720px,calc(100% - 32px));height:min(900px,calc(100% - 32px));border-radius:" + (radius ? radius + "px" : "16px") + ";box-shadow:0 20px 50px rgba(0,0,0,.35);"));
        venster.setAttribute("role", "dialog");
        venster.setAttribute("aria-modal", "true");
        venster.setAttribute("aria-label", "Rekentool" + (contactAttr.naam ? " " + contactAttr.naam : ""));
        venster.tabIndex = -1;
        var kop = el("div", "display:flex;align-items:center;justify-content:flex-end;flex:0 0 auto;padding:4px;background:#fff;border-bottom:1px solid #e5e7eb");
        sluitKnop = el("button", "all:initial;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:44px;height:44px;cursor:pointer;font:400 28px/1 system-ui,sans-serif;color:#111827;border-radius:8px", "×");
        sluitKnop.type = "button";
        sluitKnop.setAttribute("aria-label", "Sluiten");
        sluitKnop.addEventListener("click", veilig(function () { sluit(false); }));
        kop.appendChild(sluitKnop);
        frame = d.createElement("iframe");
        frame.title = "Rekentool" + (contactAttr.naam ? " " + contactAttr.naam : "");
        frame.setAttribute("allowtransparency", "false");
        frame.style.cssText = "display:block;width:100%;flex:1 1 auto;min-height:0;border:0;background:#fff;opacity:0";
        ladenEl = el("p", "position:absolute;top:50%;left:0;right:0;margin:0;text-align:center;font:500 16px system-ui,sans-serif;color:#4b5563", "Rekentool laden…");
        // Focus blijft in het venster: de randen sturen de Tab-toets terug naar binnen.
        var randStijl = "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0";
        var voor = el("span", randStijl); voor.tabIndex = 0;
        var na = el("span", randStijl); na.tabIndex = 0;
        voor.addEventListener("focus", veilig(function () { frame.focus(); }));
        na.addEventListener("focus", veilig(function () { sluitKnop.focus(); }));
        venster.appendChild(voor);
        venster.appendChild(kop);
        venster.appendChild(frame);
        venster.appendChild(ladenEl);
        venster.appendChild(na);
        achtergrond.appendChild(venster);
        achtergrond.addEventListener("mousedown", veilig(function (e) { if (e.target === achtergrond) sluit(false); }));

        opMelding(frame, function (m) {
          if (m.type === "kostenplan:klaar" || m.type === "kostenplan:resize") {
            clearTimeout(wachtTimer);
            stand.klaar = true;
            if (ladenEl && ladenEl.parentNode) ladenEl.parentNode.removeChild(ladenEl);
            frame.style.opacity = "1";
            opslaanLezen(toolId, contactAttr);
          } else if (m.type === "kostenplan:fout") {
            clearTimeout(wachtTimer);
            toonKaart();
          } else if (m.type === "kostenplan:sluit") {
            sluit(false);
          }
        });
      }

      var toonKaart = veilig(function () {
        if (stand.klaar || stand.kaart) return;
        stand.kaart = true;
        if (ladenEl && ladenEl.parentNode) ladenEl.parentNode.removeChild(ladenEl);
        frame.style.display = "none";
        haalContact(function (contact, oud) {
          if (oud && oud.parentNode) oud.parentNode.removeChild(oud);
          kaartEl = bouwKaart(contact, venster, 0);
          if (kaartEl) { kaartEl.style.flex = "1 1 auto"; kaartEl.style.borderRadius = "0"; venster.insertBefore(kaartEl, venster.lastChild); }
          return kaartEl;
        });
      });

      function vergrendel() {
        // Pagina erachter: niet scrollen (zonder dat de pagina verspringt) en niet bedienbaar.
        var b = d.body, root = d.documentElement;
        var balk = Math.max(0, w.innerWidth - root.clientWidth);
        oudeBody = { overflow: b.style.overflow, paddingRight: b.style.paddingRight };
        if (balk > 0) b.style.paddingRight = (parseFloat(w.getComputedStyle(b).paddingRight) || 0) + balk + "px";
        b.style.overflow = "hidden";
        geblokkeerd = [];
        for (var k = 0; k < b.children.length; k++) {
          var kind = b.children[k];
          if (kind === venstergastheer || kind.tagName === "SCRIPT" || kind.tagName === "STYLE" || kind.hasAttribute("inert")) continue;
          kind.setAttribute("inert", "");
          geblokkeerd.push(kind);
        }
      }
      function ontgrendel() {
        for (var k = 0; k < geblokkeerd.length; k++) geblokkeerd[k].removeAttribute("inert");
        geblokkeerd = [];
        if (oudeBody) { d.body.style.overflow = oudeBody.overflow; d.body.style.paddingRight = oudeBody.paddingRight; oudeBody = null; }
      }

      var opToets = veilig(function (e) {
        if (open && e.key === "Escape") { e.stopPropagation(); sluit(false); }
      });
      var opTerug = veilig(function () { if (open) sluit(true); });

      function openVenster(sleutel) {
        if (open) return;
        open = true;
        vorigeFocus = d.activeElement;
        if (!venster) bouwVenster();
        if (!geladen) {
          geladen = true;
          frame.src = bouwBron(sleutel, true);
          wachtTimer = setTimeout(veilig(function () { if (!stand.klaar) toonKaart(); }), WACHT + 2000);
        }
        vensterWortel.appendChild(achtergrond);
        d.body.appendChild(venstergastheer);
        vergrendel();
        knop.setAttribute("aria-expanded", "true");
        // Het terug-gebaar (Android) sluit de pop-up in plaats van de pagina.
        try { w.history.pushState({ kp: historyId }, ""); historyBezet = true; } catch (e) { historyBezet = false; }
        w.addEventListener("popstate", opTerug);
        d.addEventListener("keydown", opToets, true);
        sluitKnop.focus();
      }

      function sluit(viaTerug) {
        if (!open) return;
        open = false;
        w.removeEventListener("popstate", opTerug);
        d.removeEventListener("keydown", opToets, true);
        if (venstergastheer.parentNode) venstergastheer.parentNode.removeChild(venstergastheer);
        ontgrendel();
        knop.setAttribute("aria-expanded", "false");
        if (historyBezet && !viaTerug) { try { if (w.history.state && w.history.state.kp === historyId) w.history.back(); } catch (e) {} }
        historyBezet = false;
        if (vorigeFocus && vorigeFocus !== c && vorigeFocus.focus && d.contains(vorigeFocus)) vorigeFocus.focus();
        else knop.focus();
      }

      knop.addEventListener("click", veilig(function () { openVenster(""); }));
      // Alvast laden zodra de bezoeker de knop benadert: dan staat de rekentool er meteen.
      var vooraf = veilig(function () {
        if (geladen || !w.fetch) return;
        var l = d.createElement("link");
        l.rel = "preconnect";
        l.href = app;
        d.head.appendChild(l);
      });
      knop.addEventListener("pointerenter", vooraf, { once: true });
      knop.addEventListener("focus", vooraf, { once: true });

      // Een deep link (?kp=schutting) opent de pop-up meteen op dat onderdeel.
      var link = deepLink();
      if (link) setTimeout(veilig(function () { openVenster(link); }), 0);
    }
  }

  var start = veilig(function () {
    var lijst = d.querySelectorAll("[data-kostenplan]");
    for (var i = 0; i < lijst.length; i++) veilig(init)(lijst[i]);
  });
  w.__kostenplanLoader2 = start;
  start();
})(window, document);
