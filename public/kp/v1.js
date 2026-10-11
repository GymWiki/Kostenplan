/* eslint-disable @typescript-eslint/no-unused-vars */
/* Kostenplan rekentool-loader, versie 1. Onveranderlijk bestand: wijzigingen komen in v2.js. */
(function (w, d) {
  "use strict";
  if (w.__kostenplanLoader1) {
    try { w.__kostenplanLoader1(); } catch (e) {}
    return;
  }
  var WACHT = 4000; // ms tot de rekentool "klaar" moet melden
  var BEWAAR_DAGEN = 30;
  var SLEUTEL = "kp:v1:";

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

  function init(c) {
    if (c.__kp) return;
    c.__kp = 1;
    var toolId = lees(c, "kp");
    var app = lees(c, "app").replace(/\/$/, "");
    if (!toolId || !app) return;
    // Alles wat het kleine inline-script al neerzette (noodkaart) maakt plaats.
    while (c.firstChild) c.removeChild(c.firstChild);
    var minHoogte = parseInt(lees(c, "hoogte"), 10) || 600;
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
    var bron = app + "/embed/" + encodeURIComponent(toolId);
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
    }

    var bouwKaart = veilig(function (contact) {
      if (kaartEl && kaartEl.parentNode) kaartEl.parentNode.removeChild(kaartEl);
      var kleur = kleurOk(contact.kleur) || "#15803d";
      var bg = kleurOk(contact.bg) || "#f7faf8";
      var tel = telSchoon(contact.tel);
      var mail = String(contact.mail || "");
      var wa = telSchoon(contact.wa).replace(/^\+/, "");
      var heeftContact = Boolean(tel || mail);
      var kaart = el("div",
        "box-sizing:border-box;min-height:" + minHoogte + "px;display:flex;align-items:center;justify-content:center;padding:24px;background:" +
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
      kaartEl = kaart;
      c.appendChild(kaart);
    });

    // Contactgegevens voor de kaart: eerst wat er op de pagina staat, daarna
    // (asynchroon) de nieuwste uit de gepubliceerde kopie of uit de browser.
    var toonKaart = veilig(function () {
      if (stand.klaar || stand.kaart) return;
      stand.kaart = true;
      verbergSkelet();
      frame.style.display = "none";
      var bewaard = opslaanLezen(toolId);
      var start = contactAttr.tel || contactAttr.mail ? contactAttr : bewaard || contactAttr;
      bouwKaart(start);
      var snap = lees(c, "snap").replace(/\/$/, "");
      if (!snap || !w.fetch) return;
      var ctl = w.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 2500);
      w.fetch(snap + "/s/" + encodeURIComponent(toolId) + "/latest.json", { signal: ctl ? ctl.signal : undefined, cache: "default" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(veilig(function (s) {
          clearTimeout(timer);
          if (!s || !s.bedrijf || stand.klaar || !stand.kaart) return;
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
            bouwKaart(vers);
          }
        }))
        ["catch"](function () { clearTimeout(timer); });
    });

    c.appendChild(skel);
    c.appendChild(frame);

    var wachtTimer = null;
    function startLaden() {
      wachtTimer = setTimeout(veilig(function () { if (!stand.klaar) toonKaart(); }), WACHT);
    }

    w.addEventListener("message", veilig(function (e) {
      if (e.source !== frame.contentWindow) return;
      var m = e.data;
      if (!m || typeof m !== "object" || m.toolId !== toolId) return;
      if (m.type === "kostenplan:klaar") {
        clearTimeout(wachtTimer);
        toonRekentool();
      } else if (m.type === "kostenplan:resize" && typeof m.height === "number") {
        clearTimeout(wachtTimer);
        if (!stand.klaar) toonRekentool();
        frame.style.height = Math.max(m.height, minHoogte) + "px";
      } else if (m.type === "kostenplan:fout") {
        clearTimeout(wachtTimer);
        stand.fout = true;
        toonKaart();
      }
    }));

    // Pas laden als de rekentool bijna in beeld komt: de site van de hovenier
    // wordt er niet trager van, en de wachttijd telt vanaf dat moment.
    var begonnen = false;
    var begin = veilig(function () {
      if (begonnen) return;
      begonnen = true;
      frame.src = bron;
      startLaden();
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

  var start = veilig(function () {
    var lijst = d.querySelectorAll("[data-kp]");
    for (var i = 0; i < lijst.length; i++) veilig(init)(lijst[i]);
  });
  w.__kostenplanLoader1 = start;
  start();
})(window, document);
