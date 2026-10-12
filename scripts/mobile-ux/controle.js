// Mobiele controles: tikken per taak, tikdoelen, toetsenbord, sheets, PWA, push (Playwright, 390 x 844).
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const cookie = require("./cookie.js")();
const BASE = "http://localhost:3200";
const TOOL = process.env.TOOL, LEAD = process.env.LEAD;
const res = [];
const rapport = (naam, ok, details) => { res.push({ naam, ok, details }); console.log(`${ok ? "PASS" : "FAIL"}  ${naam}  ${details || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));

async function nieuw(b, w = 390, h = 844) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addCookies([cookie]);
  await ctx.grantPermissions(["notifications"], { origin: BASE });
  const p = await ctx.newPage();
  const fouten = [];
  p.on("pageerror", (e) => fouten.push(e.message));
  return { ctx, p, fouten };
}
let taps = 0;
const tik = async (loc) => { taps += 1; await loc.first().tap(); };
const start = async (p, url) => { await p.goto(BASE + url, { waitUntil: "networkidle" }); await slaap(500); taps = 0; };

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });

  // 1a. nieuwe lead openen en klant bellen (vanaf de Leads-lijst)
  {
    const { ctx, p, fouten } = await nieuw(b);
    await start(p, "/dashboard/leads");
    await tik(p.getByRole("button", { name: /Marieke de Boer/ }));
    const bel = p.getByRole("link", { name: "Bellen" });
    await bel.waitFor({ timeout: 8000 });
    const href = await bel.first().getAttribute("href");
    taps += 1; // tikken op Bellen
    rapport("1a. Lead openen en bellen: aantal tikken", taps <= 2 && /^tel:/.test(href), `${taps} tikken, ${href}`);
    await ctx.close();
  }
  // 1b. prijs van een materiaal wijzigen
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard/tools");
    await tik(p.getByRole("link", { name: /Tuinaanleg/ }));
    await tik(p.getByRole("button", { name: "Prijzen", exact: true }));
    const veld = p.getByLabel(/Jouw prijs/).first();
    await veld.waitFor({ timeout: 8000 });
    await tik(veld);
    await veld.fill("61");
    await p.getByText("Alles opgeslagen").waitFor({ timeout: 10000 });
    rapport("1b. Prijs van een materiaal wijzigen: aantal tikken", taps <= 4, `${taps} tikken (kaart, Prijzen, prijsveld) + typen, automatisch opgeslagen`);
    await ctx.close();
  }
  // 1c. werkzaamheid verbergen op de website
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard/tools");
    await tik(p.getByRole("link", { name: /Tuinaanleg/ }));
    const sw = p.getByRole("checkbox", { name: /Schutting op je website/ });
    const voor = await sw.isChecked();
    await tik(p.locator("label", { hasText: "Op je website" }).filter({ has: p.getByRole("checkbox", { name: /Schutting op je website/ }) }));
    await slaap(800);
    const na = await p.getByRole("checkbox", { name: /Schutting op je website/ }).isChecked();
    rapport("1c. Werkzaamheid verbergen op de website: aantal tikken", taps <= 2 && voor !== na, `${taps} tikken (kaart, schakelaar), ${voor} → ${na}`);
    // terugzetten
    await tik(p.locator("label", { hasText: "Op je website" }).filter({ has: p.getByRole("checkbox", { name: /Schutting op je website/ }) }));
    await ctx.close();
  }
  // 1d. nieuwe werkzaamheid uit een preset
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard/tools");
    await tik(p.getByRole("link", { name: /Tuinaanleg/ }));
    await tik(p.getByRole("button", { name: /Werkzaamheid$/ }));
    await tik(p.getByRole("dialog").getByRole("button", { name: /Boom planten/ }));
    await p.getByText(/Op je website/).first().waitFor({ timeout: 10000 });
    await slaap(800);
    const kop = await p.locator("h1").first().innerText();
    rapport("1d. Nieuwe werkzaamheid uit preset: aantal tikken", taps <= 4 && /Boom/i.test(kop), `${taps} tikken (kaart, + Werkzaamheid, preset); scherm: ${kop}`);
    await ctx.close();
  }
  // 1e. offerte maken vanuit een lead en versturen
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard/leads");
    await tik(p.getByRole("button", { name: /Sanne Visser/ }));
    await tik(p.getByRole("button", { name: "Offerte maken" }));
    await tik(p.getByRole("button", { name: /Kostenplan/ }).first());
    await p.getByRole("button", { name: "Controleren en versturen" }).waitFor({ timeout: 15000 });
    await tik(p.getByRole("button", { name: "Controleren en versturen" }));
    const bevestig = p.getByRole("button", { name: /Versturen|Genereer|Bevestig|Ja/ }).last();
    await bevestig.waitFor({ timeout: 8000 });
    const tekst = await bevestig.innerText();
    await tik(bevestig);
    await slaap(1500);
    rapport("1e. Offerte maken vanuit lead en versturen: aantal tikken", taps <= 6, `${taps} tikken (lead, Offerte maken, In Kostenplan, Controleren, "${tekst.trim()}")`);
    await ctx.close();
  }

  // 3. tikdoelen: uit de meting van schermen.js
  // 4. toetsenbord: veld zichtbaar, tabbalk en actiebalk weg
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard/tools");
    await p.getByRole("link", { name: /Tuinaanleg/ }).first().tap();
    await p.getByRole("button", { name: "Prijzen", exact: true }).first().tap();
    const veld = p.getByLabel(/Jouw prijs/).first();
    await veld.waitFor();
    await veld.tap();
    await p.setViewportSize({ width: 390, height: 440 }); // toetsenbord neemt ± 400 px
    await slaap(900);
    const zicht = await veld.evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.visualViewport.height; });
    const tabbalk = await p.locator('nav[aria-label="Hoofdmenu"]').count();
    rapport("4. Toetsenbord open: actief veld zichtbaar", zicht, "");
    rapport("4. Toetsenbord open: tabbalk verborgen", tabbalk === 0, `tabbalk aanwezig: ${tabbalk}`);
    await ctx.close();
    const { ctx: c2, p: p2 } = await nieuw(b);
    await start(p2, "/dashboard");
    const balkVoor = await p2.locator("[data-actiebalk]").count();
    await p2.setViewportSize({ width: 390, height: 440 });
    await p2.evaluate(() => { const i = document.createElement("input"); i.id = "x"; document.body.appendChild(i); i.focus(); });
    await slaap(700);
    const balkNa = await p2.locator("[data-actiebalk]").count();
    rapport("4. Toetsenbord open: actiebalk verdwijnt", balkVoor === 1 && balkNa === 0, `voor ${balkVoor}, na ${balkNa}`);
    await c2.close();
  }

  // 5. sheets: vegen, terugknop, toetsenbord (Escape)
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard/tools");
    await p.getByRole("link", { name: /Tuinaanleg/ }).first().tap();
    const open = async () => { await p.getByRole("button", { name: "Prijzen", exact: true }).first().tap(); await p.getByRole("dialog").waitFor(); await slaap(300); };
    await open();
    await p.goBack(); await slaap(500);
    const naTerug = await p.getByRole("dialog").count();
    const nogOpTool = /\/dashboard\/tools\/[^/?]+/.test(p.url());
    rapport("5. Sheet sluit met de terugknop (en blijft op dezelfde pagina)", naTerug === 0 && nogOpTool, p.url());
    await open();
    await p.keyboard.press("Escape"); await slaap(400);
    rapport("5. Sheet sluit met Escape/toetsenbord", (await p.getByRole("dialog").count()) === 0, "");
    await p.getByRole("button", { name: "Werktempo", exact: true }).first().tap(); await p.getByRole("dialog").waitFor(); await slaap(400);
    const handvat = p.getByRole("dialog").locator("div.touch-none").first();
    const box = await handvat.boundingBox();
    const cdpT = await ctx.newCDPSession(p);
    const x = box.x + box.width / 2, y = box.y + 10;
    await cdpT.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdpT.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + i * 40 }] });
    await cdpT.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await slaap(500);
    rapport("5. Sheet (halve stand) sluit door naar beneden te vegen", (await p.getByRole("dialog").count()) === 0, "");
    await open();
    const knop = p.getByRole("dialog").getByRole("button", { name: "Sluiten" }).last();
    await knop.tap(); await slaap(300);
    rapport("5. Sheet sluit met de sluitknop", (await p.getByRole("dialog").count()) === 0, "");
    await ctx.close();
  }

  // 8. PWA: manifest, installeerbaarheid, service worker, push-gebeurtenis
  {
    const { ctx, p } = await nieuw(b);
    await start(p, "/dashboard");
    const manifestHref = await p.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute("href"));
    const man = manifestHref ? await (await ctx.request.get(BASE + manifestHref)).json() : null;
    const iconen = man ? await Promise.all(man.icons.map(async (i) => (await ctx.request.get(BASE + i.src)).status())) : [];
    rapport("8. Manifest met naam, start_url, standalone en iconen", Boolean(man && man.name && man.start_url && man.display === "standalone" && iconen.every((s) => s === 200) && man.icons.some((i) => i.purpose === "maskable")), JSON.stringify({ start_url: man && man.start_url, iconen }));
    await slaap(2500);
    const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration("/"); return Boolean(r && r.active); });
    rapport("8. Service worker (app-schil) actief", sw, "");
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Page.enable");
    const inst = await cdp.send("Page.getInstallabilityErrors");
    const fouten = (inst.installabilityErrors || []).map((e) => e.errorId);
    rapport("8. Installeerbaar (Chrome-installatiecriteria)", fouten.filter((e) => !["not-from-secure-origin", "no-matching-service-worker", "in-incognito"].includes(e)).length === 0, fouten.length ? `meldt alleen lokale zaken: ${fouten.join(", ")}` : "geen fouten");
    // push: bezorg een bericht aan de service worker en kijk of er een melding verschijnt
    const versions = [];
    cdp.on("ServiceWorker.workerVersionUpdated", (e) => versions.push(...e.versions));
    await cdp.send("ServiceWorker.enable");
    await slaap(800);
    const reg = versions.find((v) => v.status === "activated" && /\/sw\.js$/.test(v.scriptURL));
    let melding = false;
    if (reg) {
      await cdp.send("ServiceWorker.deliverPushMessage", { origin: BASE, registrationId: reg.registrationId, data: JSON.stringify({ titel: "Nieuwe aanvraag", tekst: "Piet · Terras · € 400,00", url: "/dashboard/leads?lead=x" }) });
      await slaap(800);
      melding = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration("/"); const n = await r.getNotifications(); return n.some((x) => x.title === "Nieuwe aanvraag" && /Piet/.test(x.body)); });
    }
    rapport("8. Push-gebeurtenis in de service worker toont een melding (gesimuleerd)", melding, reg ? "melding aanwezig" : "geen worker-versie gevonden");
    await ctx.close();
  }

  fs.writeFileSync(__dirname + "/controle-resultaten.json", JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message); fs.writeFileSync(__dirname + "/controle-resultaten.json", JSON.stringify(res, null, 2)); process.exit(1); });
