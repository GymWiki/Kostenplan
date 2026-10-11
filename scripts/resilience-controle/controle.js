const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const S = __dirname;
const APP = "http://127.0.0.1:3100", FX = "http://127.0.0.1:4010", HOST = "http://127.0.0.1:4020";
const resultaten = [];
const rapport = (naam, ok, details) => { resultaten.push({ naam, ok, details }); console.log(`${ok ? "PASS" : "FAIL"}  ${naam}  ${details || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));

const CLS_SCRIPT = `
  window.__cls = 0; window.__fouten = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (e) {}
  window.addEventListener("error", (e) => window.__fouten.push(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => window.__fouten.push("rejection: " + String(e.reason)));
`;

async function browser() {
  return chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
}
async function context(b, o = {}) {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, ...o });
  await ctx.addInitScript(CLS_SCRIPT);
  return ctx;
}
function bewaak(page, naam) {
  const uit = { pageerrors: [], consoleErrors: [], netwerk: [] };
  page.on("pageerror", (e) => uit.pageerrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (t.startsWith("Failed to load resource") || t.includes("net::ERR_")) uit.netwerk.push(t);
    else uit.consoleErrors.push(t);
  });
  return uit;
}
async function cls(page) {
  let top = 0, binnen = 0;
  try { top = await page.evaluate(() => window.__cls || 0); } catch {}
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try { binnen += await f.evaluate(() => window.__cls || 0); } catch {}
  }
  return { top: +top.toFixed(4), iframe: +binnen.toFixed(4) };
}
const embedFrame = (page) => page.frames().find((f) => f.url().includes("/embed/t-demo"));
async function wachtOpRekentool(page, ms = 15000) {
  const eind = Date.now() + ms;
  while (Date.now() < eind) {
    const f = embedFrame(page);
    if (f) { try { if (await f.locator('input[id$="sv-lengte"]').count()) return f; } catch {} }
    await slaap(150);
  }
  return null;
}
async function bereken(frame, l = 5, br = 4) {
  await frame.locator('input[id$="sv-lengte"]').fill(String(l));
  await frame.locator('input[id$="sv-breedte"]').fill(String(br));
  await frame.locator('select[id^="materiaal-"]').selectOption({ index: 2 });
  await slaap(500);
  const tekst = await frame.locator("body").innerText();
  const m = /Totaal \(incl\. btw\)\s*\n\s*([^\n]+)/i.exec(tekst);
  return m ? m[1].trim() : null;
}
const stand = (set) => fetch(`${FX}/__stand?set=${encodeURIComponent(JSON.stringify(set))}`).then((r) => r.json());

function pidStop(naam) { try { process.kill(Number(fs.readFileSync(`${S}/${naam}.pid`, "utf8")), "SIGTERM"); } catch {} }
function startApp() {
  const p = spawn("npx", ["next", "start", "-p", "3100"], {
    cwd: "/home/user/Kostenplan", detached: true, stdio: ["ignore", fs.openSync(`${S}/app.log`, "a"), fs.openSync(`${S}/app.log`, "a")],
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x", DATABASE_URL: "postgresql://x:x@127.0.0.1:9/x", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_abc_x", SNAPSHOT_BASE_URL: FX, SNAPSHOT_MIRROR_URL: "http://127.0.0.1:4011" },
  });
  fs.writeFileSync(`${S}/app.pid`, String(p.pid)); p.unref();
}
function startFx(poort) {
  const p = spawn("node", [`${S}/fx-server.js`, String(poort)], { detached: true, stdio: "ignore" });
  fs.writeFileSync(`${S}/fx${poort}.pid`, String(p.pid)); p.unref();
}
async function wachtOp(url, ms = 30000) {
  const eind = Date.now() + ms;
  while (Date.now() < eind) { try { const r = await fetch(url); if (r.status < 500) return true; } catch {} await slaap(300); }
  return false;
}
// next start draait via npx -> de echte server is een kindproces; stop de hele procesgroep.
function stopGroep(naam) { try { process.kill(-Number(fs.readFileSync(`${S}/${naam}.pid`, "utf8")), "SIGTERM"); } catch {} }

(async () => {
  const b = await browser();
  startFx(4020);
  await wachtOp(`${HOST}/host-nieuw.html`);

  // 1. Database onbereikbaar -> rekentool laadt en rekent uit de snapshot, zelfde uitkomst als de bestaande weergave
  {
    const ctx = await context(b); const page = await ctx.newPage(); const w = bewaak(page);
    const ref = await ctx.newPage();
    await ref.goto(`${APP}/zz-preview/voorbeeld`);
    const refFrame = ref.mainFrame();
    await refFrame.locator('input[id$="sv-lengte"]').first().waitFor({ timeout: 15000 });
    const refTotaal = await bereken(refFrame);
    const res = await fetch(`${APP}/embed/t-demo`);
    await page.goto(`${HOST}/host-nieuw.html`);
    const f = await wachtOpRekentool(page);
    const totaal = f ? await bereken(f) : null;
    await slaap(1500);
    rapport("1. DB onbereikbaar: embed-pagina geeft 200 uit snapshot", res.status === 200, `status ${res.status}`);
    rapport("1. DB onbereikbaar: rekentool laadt en rekent", Boolean(f && totaal), `totaal ${totaal}`);
    rapport("1. Rekenuitkomst identiek aan de bestaande weergave", totaal !== null && totaal === refTotaal, `snapshot ${totaal} / bestaand ${refTotaal}`);
    const c = await cls(page);
    rapport("6. (scenario 1) geen uncaught fouten/console-errors", w.pageerrors.length === 0 && w.consoleErrors.length === 0, JSON.stringify({ w, c }).slice(0, 400));
    await ctx.close();
  }

  // 2a. Trage scriptbron -> reserve (niveau 2), site van de hovenier ongehinderd
  {
    const ctx = await context(b); const page = await ctx.newPage(); const w = bewaak(page);
    await ctx.route(`${APP}/kp/v1.js`, async (route) => { await slaap(15000); route.abort().catch(() => {}); });
    const t0 = Date.now();
    await page.goto(`${HOST}/host-nieuw.html`, { waitUntil: "load" });
    const loadMs = Date.now() - t0;
    await page.click("#b"); await page.click("#b");
    const klik = await page.locator("#b").innerText();
    const f = await wachtOpRekentool(page, 14000);
    const tKlaar = Date.now() - t0;
    const totaal = f ? await bereken(f) : null;
    await slaap(1000);
    const c = await cls(page);
    rapport("2a. Trage scripthost: pagina van de hovenier laadt snel en blijft bedienbaar", loadMs < 1500 && klik === "2", `load ${loadMs}ms, klik-teller ${klik}`);
    rapport("2a. Trage scripthost: reserve-bron neemt het over binnen ~6 s", Boolean(f) && tKlaar < 9000 && totaal !== null, `rekentool na ${tKlaar}ms, totaal ${totaal}`);
    rapport("6. (scenario 2a) geen uncaught fouten, CLS laag", w.pageerrors.length === 0 && w.consoleErrors.length === 0 && c.top < 0.1, JSON.stringify({ c, pageerrors: w.pageerrors, consoleErrors: w.consoleErrors }));
    await ctx.close();
  }

  // 2b. Beide scriptbronnen weg -> inline contactkaart uit de embedcode
  {
    const ctx = await context(b); const page = await ctx.newPage(); const w = bewaak(page);
    await ctx.route(`${APP}/kp/v1.js`, (r) => r.abort());
    await ctx.route(`${FX}/kp/v1.js`, (r) => r.abort());
    const t0 = Date.now();
    await page.goto(`${HOST}/host-nieuw.html`);
    await page.getByText("Bereken je prijs telefonisch of per mail").waitFor({ timeout: 15000 });
    const na = Date.now() - t0;
    const tel = await page.locator('a[href^="tel:"]').first().getAttribute("href");
    const mail = await page.locator('a[href^="mailto:"]').first().getAttribute("href");
    const geenFrame = !embedFrame(page);
    const c = await cls(page);
    rapport("2b. Scripts onbereikbaar: contactkaart met juiste gegevens", tel === "tel:0612345678" && mail === "mailto:info@devries.nl" && geenFrame, `na ${na}ms, ${tel}, ${mail}`);
    rapport("6. (scenario 2b) geen uncaught fouten, CLS laag", w.pageerrors.length === 0 && w.consoleErrors.length === 0 && c.top < 0.1, JSON.stringify({ c, w }));
    await page.screenshot({ path: `${S}/kaart-inline.png` });
    await ctx.close();
  }

  // 3. Alles onbereikbaar (echt: app en reserve gestopt)
  {
    // 3a. eerst een normaal bezoek (vult browsercache, service worker en localStorage)
    const ctx = await context(b); const page = await ctx.newPage(); const w1 = bewaak(page);
    await page.goto(`${HOST}/host-nieuw.html`);
    const f = await wachtOpRekentool(page);
    await slaap(2500); // service worker activeren en bestanden bewaren
    const sw = f ? await f.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration("/embed/"); return Boolean(r && (r.active || r.waiting || r.installing)); }).catch(() => false) : false;
    const ls = await page.evaluate(() => localStorage.getItem("kp:v1:t-demo"));
    await page.close();
    // 3b. nu alles uit
    stopGroep("app"); pidStop("fx4010"); await slaap(1500);
    try { execSync("fuser -k 3100/tcp 4010/tcp", { stdio: "ignore" }); } catch {}
    await slaap(500);
    const p2 = await ctx.newPage(); const w2 = bewaak(p2);
    await p2.goto(`${HOST}/host-nieuw.html`);
    const f2 = await wachtOpRekentool(p2, 12000);
    const totaal = f2 ? await bereken(f2) : null;
    await slaap(800);
    const c = await cls(p2);
    rapport("3. Eerder bezocht + alles onbereikbaar: rekentool werkt uit de browser", Boolean(f2 && totaal), `service worker ${sw}, totaal ${totaal}`);
    rapport("3. Contactgegevens onthouden in localStorage", Boolean(ls) && ls.includes("0612345678"), ls ? "aanwezig" : "ontbreekt");
    await p2.screenshot({ path: `${S}/offline-eerder-bezocht.png` });
    rapport("6. (scenario 3, eerder bezocht) geen uncaught fouten", w2.pageerrors.length === 0 && w2.consoleErrors.length === 0, JSON.stringify({ c, pageerrors: w2.pageerrors, consoleErrors: w2.consoleErrors }));
    await ctx.close();

    // 3c. zonder eerder bezoek -> contactkaart met juiste gegevens
    const ctx2 = await context(b); const p3 = await ctx2.newPage(); const w3 = bewaak(p3);
    const t0 = Date.now();
    await p3.goto(`${HOST}/host-nieuw.html`);
    await p3.getByText("Bereken je prijs telefonisch of per mail").waitFor({ timeout: 15000 });
    const na = Date.now() - t0;
    const tel = await p3.locator('a[href^="tel:"]').first().getAttribute("href");
    const mail = await p3.locator('a[href^="mailto:"]').first().getAttribute("href");
    const c3 = await cls(p3);
    await p3.screenshot({ path: `${S}/offline-eerste-keer.png` });
    rapport("3. Nooit bezocht + alles onbereikbaar: contactkaart met juiste gegevens", tel === "tel:0612345678" && mail === "mailto:info@devries.nl", `na ${na}ms`);
    rapport("6. (scenario 3, eerste keer) geen uncaught fouten, CLS laag", w3.pageerrors.length === 0 && w3.consoleErrors.length === 0 && c3.top < 0.1, JSON.stringify({ c3, pageerrors: w3.pageerrors, consoleErrors: w3.consoleErrors }));
    // 7. neutrale melding zonder contactgegevens (oude embedcode zonder data-attributen)
    const p4 = await ctx2.newPage(); const w4 = bewaak(p4);
    await p4.goto(`${HOST}/host-oud-attr.html`);
    await p4.getByText("Deze rekentool is tijdelijk niet beschikbaar.").waitFor({ timeout: 15000 });
    const geenKnoppen = (await p4.locator('a[href^="tel:"], a[href^="mailto:"]').count()) === 0;
    rapport("7. Embedcode zonder contact-attributen: neutrale melding, geen contactkaart", geenKnoppen, "");
    rapport("6. (scenario 7) geen uncaught fouten", w4.pageerrors.length === 0 && w4.consoleErrors.length === 0, JSON.stringify(w4).slice(0, 300));
    await ctx2.close();
  }

  // alles weer aan
  startFx(4010); startApp();
  await wachtOp(`${FX}/s/t-demo/latest.json`); await wachtOp(`${APP}/embed/t-demo`, 60000);
  await slaap(1000);

  // 7. Oudste embedcode (iframe + resize-script) werkt nog
  {
    const ctx = await context(b); const page = await ctx.newPage(); const w = bewaak(page);
    await page.goto(`${HOST}/host-oudste.html`);
    const f = await wachtOpRekentool(page);
    const totaal = f ? await bereken(f) : null;
    await slaap(1200);
    const hoogte = await page.locator("iframe").evaluate((e) => e.getBoundingClientRect().height);
    rapport("7. Oude embedcode (iframe + resize-script) werkt nog, inclusief hoogte-aanpassing", Boolean(totaal) && hoogte >= 600, `totaal ${totaal}, hoogte ${Math.round(hoogte)}`);
    rapport("6. (scenario 7, oude code) geen uncaught fouten", w.pageerrors.length === 0 && w.consoleErrors.length === 0, JSON.stringify(w).slice(0, 300));
    await ctx.close();
  }

  // 7b/iframe-variant: contactkaart als de rekentool niet laadt
  {
    const ctx = await context(b); const page = await ctx.newPage(); const w = bewaak(page);
    await ctx.route(`${APP}/embed/**`, (r) => r.abort());
    await page.goto(`${HOST}/host-iframe.html`);
    await page.getByText("Bereken je prijs telefonisch of per mail").waitFor({ state: "visible", timeout: 12000 });
    rapport("2c. Alleen-iframe-variant: contactkaart zichtbaar als de iframe niet laadt", true, "");
    rapport("6. (scenario iframe-variant) geen uncaught fouten", w.pageerrors.length === 0 && w.consoleErrors.length === 0, JSON.stringify(w).slice(0, 300));
    await ctx.close();
  }

  // 4. Versturen faalt (echte server, database onbereikbaar -> 503) -> bewaard, volgend bezoek precies één keer
  {
    const ctx = await context(b); const page = await ctx.newPage(); const w = bewaak(page);
    await page.goto(`${HOST}/host-nieuw.html`);
    let f = await wachtOpRekentool(page);
    await bereken(f);
    await f.getByRole("button", { name: "Offerte aanvragen" }).click();
    await f.getByLabel("Naam").fill("Piet Jansen");
    await f.getByLabel("E-mailadres").fill("piet@example.nl");
    const t0 = Date.now();
    await f.getByRole("button", { name: "Versturen" }).click();
    await f.getByText("Je aanvraag is nog niet verstuurd. We proberen het automatisch opnieuw.").waitFor({ timeout: 30000 });
    const duur = Date.now() - t0;
    const mailto = await f.getByRole("link", { name: "Mail je aanvraag" }).getAttribute("href");
    const bel = await f.getByRole("link", { name: "Bel ons" }).getAttribute("href");
    const tekst = decodeURIComponent(mailto || "");
    const zichtbaar = await f.locator("textarea[readonly]").inputValue();
    const wachtrij = await f.evaluate(() => JSON.parse(localStorage.getItem("kp:leads:v1") || "[]"));
    rapport("4. Versturen faalt: eerlijke melding met Mail je aanvraag en Bel ons", mailto.startsWith("mailto:info@devries.nl") && bel === "tel:0612345678", `na ${duur}ms (3 pogingen met wachttijd)`);
    rapport("4. mailto-terugval bevat de samenvatting (ook zichtbaar/kopieerbaar)", tekst.includes("Bestrating") && tekst.includes("Piet Jansen") && zichtbaar.includes("Bestrating") && zichtbaar.includes("piet@example.nl"), tekst.slice(0, 160).replace(/\n/g, " | "));
    rapport("4. Aanvraag staat in de wachtrij van de browser", wachtrij.length === 1 && wachtrij[0].naam === "Piet Jansen", `sleutel ${wachtrij[0] && wachtrij[0].sleutel}`);
    const sleutel = wachtrij[0].sleutel;
    await page.screenshot({ path: `${S}/aanvraag-niet-verstuurd.png` });
    await page.close();

    // volgend bezoek: server accepteert nu (opvang in test)
    const ontvangen = [];
    await ctx.route(`${APP}/api/embed/lead`, async (route) => {
      ontvangen.push(JSON.parse(route.request().postData()));
      route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    const p2 = await ctx.newPage(); const w2 = bewaak(p2);
    await p2.goto(`${HOST}/host-nieuw.html`);
    await wachtOpRekentool(p2);
    await slaap(2500);
    const p3 = await ctx.newPage();
    await p3.goto(`${HOST}/host-nieuw.html`);
    await wachtOpRekentool(p3); await slaap(2500);
    const leeg = await p3.evaluate(() => JSON.parse(localStorage.getItem("kp:leads:v1") || "[]")).catch(() => null);
    const f3 = embedFrame(p3);
    const lsLeeg = f3 ? await f3.evaluate(() => JSON.parse(localStorage.getItem("kp:leads:v1") || "[]")) : null;
    rapport("4. Volgend bezoek: aanvraag komt precies één keer aan, met dezelfde sleutel", ontvangen.length === 1 && ontvangen[0].sleutel === sleutel && ontvangen[0].email === "piet@example.nl", `ontvangen ${ontvangen.length}x`);
    rapport("4. Wachtrij is daarna leeg", Array.isArray(lsLeeg) && lsLeeg.length === 0, JSON.stringify(lsLeeg));
    rapport("6. (scenario 4) geen uncaught fouten", w.pageerrors.length === 0 && w.consoleErrors.length === 0 && w2.pageerrors.length === 0 && w2.consoleErrors.length === 0, JSON.stringify({ w, w2 }).slice(0, 400));
    await ctx.close();
  }

  // 8. Na een wijziging in de editor staat de nieuwe snapshot meteen live
  {
    const ctx = await context(b); const page = await ctx.newPage();
    await page.goto(`${HOST}/host-nieuw.html`);
    const f = await wachtOpRekentool(page); const voor = await bereken(f);
    await fetch(`${FX}/__prijs?factor=2`);
    const t0 = Date.now();
    const p2 = await ctx.newPage(); await p2.goto(`${HOST}/host-nieuw.html`);
    // Pagina's zijn niet gecachet in `next start`; op Vercel geldt s-maxage=30 + SWR.
    let na = null, nu = null;
    while (Date.now() - t0 < 70000) {
      const f2 = await wachtOpRekentool(p2, 5000);
      if (f2) { nu = await bereken(f2); if (nu && nu !== voor) { na = Date.now() - t0; break; } }
      await p2.reload(); await slaap(500);
    }
    rapport("8. Nieuwe snapshot is binnen 1 minuut zichtbaar", na !== null && na < 60000, `voor ${voor} -> ${nu} na ${na}ms (lokaal zonder CDN-cache)`);
    await ctx.close();
  }

  fs.writeFileSync(`${S}/controle-resultaten.json`, JSON.stringify(resultaten, null, 2));
  console.log(`\n${resultaten.filter((r) => r.ok).length}/${resultaten.length} geslaagd`);
  await b.close();
  process.exit(0);
})().catch((e) => { console.error("HARNAS-FOUT", e); fs.writeFileSync(`${S}/controle-resultaten.json`, JSON.stringify(resultaten, null, 2)); process.exit(1); });
