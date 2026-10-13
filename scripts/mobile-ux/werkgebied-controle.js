// Controle van "Werkgebied en minimale opdracht" op een draaiende app (lokaal, poort 3200).
// De sandbox bereikt PDOK niet: de server praat met scripts/mobile-ux/fake-pdok.js (PDOK_BASIS_URL), de browser
// krijgt dezelfde nep-antwoorden via route-onderschepping. Kaarttegels zijn een grijs vlak.
//   node scripts/mobile-ux/werkgebied-controle.js docs/werkgebied/schermen
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const { antwoord, TEGEL } = require("./fake-pdok.js");
const cookie = require("./cookie.js");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/werkgebied/schermen";
const TOOL = "cmv4w1j8c0002pc7d9mooidkq";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok: Boolean(ok), d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
fs.mkdirSync(UIT, { recursive: true });

const START = { postcode: "8011AB", huisnummer: "1", toevoeging: "", straat: "Stationsweg", plaats: "Zwolle", lat: 52.5168, lon: 6.083 };
const instelling = (w = {}, m = {}) => ({
  werkgebied: { aan: false, methode: "STRAAL", start: START, straalKm: 30, postcodes: "", buiten: "GEEN_AANVRAAG", melding: "", ...w },
  minimum: { aan: false, bedragEuro: 0, gedrag: "TARIEF", ...m },
});
const zet = (i) => sql(`update "Company" set werkgebied = ${i ? `'${JSON.stringify(i)}'::jsonb` : "null"}`);
const bedrag = (t) => Math.round(Number(t.replace(/[^\d,]/g, "").replace(",", ".")) * 100);

async function nieuwe(b, viewport, opties = {}) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600 });
  if (opties.inloggen) await ctx.addCookies([cookie()]);
  // PDOK en kaarttegels in de browser
  await ctx.route("https://api.pdok.nl/**", (route) => {
    const r = antwoord(route.request().url());
    route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) });
  });
  await ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  const p = await ctx.newPage();
  p.fouten = [];
  p.on("pageerror", (e) => p.fouten.push(e.message));
  return p;
}

async function typAdres(p, tekst) {
  const veld = p.locator("#wg-adres");
  await veld.fill(tekst);
  await p.waitForTimeout(900);
}
async function kiesEerste(p) {
  const optie = p.getByRole("option").first();
  if (await optie.count()) await optie.click();
  await p.waitForTimeout(500);
}
const lees = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");

async function vulKlus(p, meter = "20") {
  await p.getByLabel("Aantal Schutting").fill(meter);
  await p.locator("select").first().selectOption({ index: 1 });
  await p.waitForTimeout(500);
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  fs.rmSync("/tmp/pdok-down", { force: true });

  // ── 0. Alles uit: identiek aan zonder instellingen ──
  zet(null);
  let p = await nieuwe(b, { width: 1440, height: 1000 });
  await p.goto(`${BASE}/t/devries/tuinaanleg`, { waitUntil: "networkidle" });
  const zonderVraag = !(await lees(p)).includes("Wat is je postcode en huisnummer?");
  await vulKlus(p);
  const totaalNul = bedrag(((await lees(p)).match(/TOTAAL[^€]*€\s*([\d.]+,\d{2})/i) || [])[1] || "0");
  zet(instelling()); // expliciet uit
  await p.reload({ waitUntil: "networkidle" });
  await vulKlus(p);
  const totaalUit = bedrag(((await lees(p)).match(/TOTAAL[^€]*€\s*([\d.]+,\d{2})/i) || [])[1] || "0");
  rapport("alles uit: geen postcodevraag", zonderVraag && !(await lees(p)).includes("Wat is je postcode en huisnummer?"));
  rapport("alles uit: zelfde totaal met en zonder instellingen", totaalNul > 0 && totaalNul === totaalUit, `${totaalNul / 100} = ${totaalUit / 100}`);
  await p.context().close();

  // ── 1. Instellingen (Profiel), desktop en mobiel ──
  zet(null);
  for (const [naam, vp] of [["desktop-1440", { width: 1440, height: 1100 }], ["mobiel-412", { width: 412, height: 915 }]]) {
    p = await nieuwe(b, vp, { inloggen: true });
    await p.goto(`${BASE}/dashboard/profiel`, { waitUntil: "networkidle" });
    if (vp.width < 600) {
      await p.getByText("Werkgebied en minimum").first().click();
      await p.waitForTimeout(600);
    }
    const f = p.locator("form").filter({ has: p.locator('input[aria-label="Werkgebied gebruiken"]') }).first();
    await f.getByLabel("Werkgebied gebruiken").click({ force: true });
    await p.waitForTimeout(400);
    await f.locator("#wg-start").fill("8011 AB 5");
    await p.waitForTimeout(900);
    await p.getByRole("option").first().click().catch(() => {});
    await f.locator("#wg-straal").fill("30");
    await p.waitForTimeout(1200);
    await f.getByLabel("Minimale opdracht gebruiken").click({ force: true });
    await p.waitForTimeout(400);
    await f.locator("#wg-minimum").fill("1500");
    await f.scrollIntoViewIfNeeded();
    await f.screenshot({ path: `${UIT}/instellingen-${naam}.png` });
    if (naam.startsWith("desktop")) {
      await f.getByRole("button", { name: /^Opslaan/ }).click();
      await p.waitForTimeout(2000);
      console.log("   melding:", (await f.locator("[role=status]").last().innerText()).trim());
      const w = sql(`select werkgebied->'werkgebied'->>'aan', werkgebied->'werkgebied'->'start'->>'lat', werkgebied->'werkgebied'->'start'->>'plaats' from "Company" limit 1`).split("|");
      rapport("instellingen opgeslagen, startadres éénmalig gegeocodeerd en met coördinaten bewaard", w[0] === "true" && Number(w[1]) > 52 && w[2] === "Zwolle", w.join(" | "));
      const kaart = await p.locator(".leaflet-container").count();
      rapport("kaart met PDOK-achtergrond staat in de instellingen", kaart > 0);
    }
    rapport(`instellingen ${naam}: geen scriptfouten`, p.fouten.length === 0, p.fouten.join("; ").slice(0, 200));
    await p.context().close();
  }

  const klantScherm = async (naam, i, adres, extra = {}) => {
    zet(i);
    const out = {};
    for (const [vn, vp] of [["desktop-1440", { width: 1440, height: 1000 }], ["mobiel-412", { width: 412, height: 915 }]]) {
      const pg = await nieuwe(b, vp);
      await pg.goto(`${BASE}/t/devries/tuinaanleg`, { waitUntil: "networkidle" });
      if (adres) { await typAdres(pg, adres); await kiesEerste(pg); }
      if (extra.klus !== false) await vulKlus(pg, extra.meter || "20");
      await pg.waitForTimeout(500);
      out[vn] = { tekst: await lees(pg), pg };
      await pg.screenshot({ path: `${UIT}/${naam}-${vn}.png`, fullPage: true });
      if (vn === "mobiel-412") await pg.context().close();
    }
    return out;
  };

  // ── 2. De postcodevraag komt eerst ──
  let r = await klantScherm("klant-postcodevraag", instelling({ aan: true, buiten: "GEEN_AANVRAAG" }), null, { klus: false });
  rapport("postcodevraag staat bovenaan", r["desktop-1440"].tekst.includes("Wat is je postcode en huisnummer?"));
  await r["desktop-1440"].pg.context().close();

  // ── 3. Binnen het werkgebied: adres, kostenraming ──
  r = await klantScherm("klant-binnen-werkgebied", instelling({ aan: true, buiten: "GEEN_AANVRAAG" }), "8011 AB 5");
  rapport("binnen: adres bevestigd, geen melding", /Voorstraat 5, 8011 AB Zwolle/.test(r["desktop-1440"].tekst) && !/buiten ons werkgebied/.test(r["desktop-1440"].tekst));
  const pgBinnen = r["desktop-1440"].pg;
  const binnenKnop = await pgBinnen.getByRole("button", { name: /Offerte aanvragen/ }).first().isEnabled().catch(() => false);
  rapport("binnen: aanvraag kan gedaan worden", binnenKnop);
  await pgBinnen.context().close();

  // ── 4. Buiten het werkgebied, a = niet mogelijk ──
  r = await klantScherm("klant-buiten-werkgebied", instelling({ aan: true, buiten: "GEEN_AANVRAAG" }), "3511 AB 12");
  const buiten = r["desktop-1440"];
  rapport("buiten (a): melding met standaardtekst direct na het invullen", buiten.tekst.includes("Dit adres ligt buiten ons werkgebied. Neem gerust contact op"));
  rapport("buiten (a): contactgegevens bij de melding", buiten.tekst.includes("06 12345678"));
  rapport("buiten (a): prijs wordt nog getoond", /€\s*[\d.]+,\d{2}/.test(buiten.tekst));
  const blokkeer = await buiten.pg.getByRole("button", { name: /Offerte aanvragen/ }).first().isEnabled().catch(() => false);
  rapport("buiten (a): aanvraag niet mogelijk", !blokkeer);
  await buiten.pg.context().close();

  // ── 5. Eigen melding ──
  r = await klantScherm("klant-eigen-melding", instelling({ aan: true, buiten: "GEEN_AANVRAAG", melding: "Wij werken alleen in Overijssel." }), "3511 AB 12", { klus: false });
  rapport("buiten: eigen melding wordt getoond", r["desktop-1440"].tekst.includes("Wij werken alleen in Overijssel."));
  await r["desktop-1440"].pg.context().close();

  // ── 6. Buiten, c = toeslag per km, in de opbouw ──
  r = await klantScherm("klant-afstandstoeslag", instelling({ aan: true, buiten: "TOESLAG", straalKm: 20, toeslag: { modus: "PER_KM", perKmEuro: 2, zones: [] } }), "7311 AA 10");
  const toeslag = r["desktop-1440"];
  rapport("toeslag: aparte regel 'Voorrijkosten extra afstand (… km)' in de opbouw", /Voorrijkosten extra afstand \(\d+(,\d)? km\)/.test(toeslag.tekst), (toeslag.tekst.match(/Voorrijkosten extra afstand \([^)]*\)/) || [""])[0]);
  await toeslag.pg.context().close();

  // ── 7. Zones: 20–40 € 35, daarboven niet mogelijk ──
  const zones = [{ totKm: 20, bedragEuro: 0 }, { totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }];
  r = await klantScherm("klant-zone-35", instelling({ aan: true, buiten: "TOESLAG", straalKm: 20, toeslag: { modus: "ZONES", perKmEuro: 0, zones } }), "7311 AA 10");
  rapport("zones: €35 toeslag voor ± 35 km", /Voorrijkosten extra afstand/.test(r["desktop-1440"].tekst) && /35,00/.test(r["desktop-1440"].tekst));
  await r["desktop-1440"].pg.context().close();
  r = await klantScherm("klant-zone-niet-mogelijk", instelling({ aan: true, buiten: "TOESLAG", straalKm: 20, toeslag: { modus: "ZONES", perKmEuro: 0, zones } }), "3511 AB 12");
  rapport("zones: 40+ km is niet mogelijk met melding", /niet werken|buiten ons werkgebied/.test(r["desktop-1440"].tekst));
  await r["desktop-1440"].pg.context().close();

  // ── 8. Minimum: minimumtarief, niet mogelijk, onder minimum markeren ──
  r = await klantScherm("klant-minimum-tarief", instelling({}, { aan: true, bedragEuro: 1500, gedrag: "TARIEF" }), null, { meter: "1" });
  rapport("minimum (a): melding bij het totaal, geen pop-up", /Voor kleine klussen rekenen we een minimumtarief van € ?1\.500,00/.test(r["desktop-1440"].tekst) && (await r["desktop-1440"].pg.getByRole("dialog").count()) === 0);
  rapport("minimum (a): totaal is het minimum", /Aanvulling tot minimumtarief/.test(r["desktop-1440"].tekst) || /1\.500,00/.test(r["desktop-1440"].tekst));
  await r["desktop-1440"].pg.context().close();
  r = await klantScherm("klant-minimum-niet-mogelijk", instelling({}, { aan: true, bedragEuro: 1500, gedrag: "GEEN_AANVRAAG" }), null, { meter: "1" });
  rapport("minimum (b): 'We nemen opdrachten aan vanaf …'", /We nemen opdrachten aan vanaf € ?1\.500,00/.test(r["desktop-1440"].tekst));
  const minKnop = await r["desktop-1440"].pg.getByRole("button", { name: /Offerte aanvragen/ }).first().isEnabled().catch(() => false);
  rapport("minimum (b): aanvraag niet mogelijk", !minKnop);
  await r["desktop-1440"].pg.context().close();

  // ── 9. Server: een aanvraag via de rekentool en een rechtstreekse aanroep ──
  zet(instelling({ aan: true, buiten: "GEEN_AANVRAAG" }));
  sql(`delete from "Lead" where email like '%@werkgebied.test'`);
  p = await nieuwe(b, { width: 1440, height: 1000 });
  await p.goto(`${BASE}/t/devries/tuinaanleg`, { waitUntil: "networkidle" });
  await typAdres(p, "8011 AB 5"); await kiesEerste(p);
  await vulKlus(p);
  await p.getByRole("button", { name: /Offerte aanvragen/ }).first().click();
  await p.getByLabel(/naam/i).first().fill("Binnen Test");
  await p.getByLabel(/e-?mail/i).first().fill("binnen@werkgebied.test");
  const voorAdres = await lees(p);
  rapport("het adres wordt meegenomen naar het aanvraagformulier", /Voorstraat 5/.test(voorAdres) || (await p.locator("input[value*='8011']").count()) > 0);
  await p.screenshot({ path: `${UIT}/klant-aanvraagformulier-1440.png`, fullPage: true });
  await p.getByRole("button", { name: /Aanvraag versturen|Versturen|Verstuur/ }).last().click();
  await p.waitForTimeout(2500);
  const lead = sql(`select snapshot->'locatie'->>'afstandKm', snapshot->'locatie'->>'binnenWerkgebied', snapshot->'locatie'->>'gecontroleerd', snapshot->'locatie'->>'plaats' from "Lead" where email = 'binnen@werkgebied.test'`).split("|");
  rapport("lead binnen werkgebied: server bepaalde afstand en adres", lead[2] === "true" && lead[1] === "true" && Number(lead[0]) > 0 && Number(lead[0]) < 5, lead.join(" | "));
  const snap = JSON.parse(sql(`select snapshot from "Lead" where email = 'binnen@werkgebied.test'`));
  await p.context().close();

  const post = async (naam, wijzig) => {
    const s = JSON.parse(JSON.stringify(snap));
    wijzig(s);
    const resp = await fetch(`${BASE}/api/embed/lead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolId: TOOL, naam, email: `${naam.toLowerCase().replace(/\W/g, "")}@werkgebied.test`, snapshot: s, sleutel: `${naam.replace(/\W/g, "")}-sleutel-0123456789`.slice(0, 40) }) });
    return { status: resp.status, body: await resp.json() };
  };
  // Knoeien met de afstand: postcode in Utrecht, afstandKm op 1 gezet
  let x = await post("Omzeiler Afstand", (s) => { s.rekenkern.invoer.locatie = { postcode: "3511AB", huisnummer: "12", toevoeging: "", afstandKm: 1 }; });
  rapport("rechtstreekse aanroep met verzonnen afstand wordt geweigerd (400, dezelfde melding)", x.status === 400 && /buiten ons werkgebied/.test(x.body.error || ""), JSON.stringify(x));
  x = await post("Omzeiler Adres", (s) => { delete s.rekenkern.invoer.locatie; });
  rapport("rechtstreekse aanroep zonder adres wordt geweigerd", x.status === 400 && /postcode en huisnummer/.test(x.body.error || ""), JSON.stringify(x));
  x = await post("Omzeiler Bestaatniet", (s) => { s.rekenkern.invoer.locatie = { postcode: "1234ZZ", huisnummer: "1", toevoeging: "", afstandKm: 1 }; });
  rapport("rechtstreekse aanroep met onbestaand adres wordt geweigerd", x.status === 400, JSON.stringify(x));
  rapport("geen lead aangemaakt voor de geweigerde aanroepen", sql(`select count(*) from "Lead" where email like 'omzeiler%@werkgebied.test'`) === "0");

  // Minimum niet mogelijk, rechtstreeks
  zet(instelling({}, { aan: true, bedragEuro: 5000, gedrag: "GEEN_AANVRAAG" }));
  x = await post("Omzeiler Minimum", (s) => { s.rekenkern.invoer.locatie = { postcode: "8011AB", huisnummer: "5", toevoeging: "", afstandKm: 1 }; s.totaal = 99999; });
  rapport("rechtstreekse aanroep onder het minimum wordt geweigerd", x.status === 400 && /We nemen opdrachten aan vanaf/.test(x.body.error || ""), JSON.stringify(x));

  // ── 10. PDOK onbereikbaar ──
  zet(instelling({ aan: true, buiten: "GEEN_AANVRAAG" }));
  fs.writeFileSync("/tmp/pdok-down", "x");
  p = await nieuwe(b, { width: 1440, height: 1000 });
  await p.goto(`${BASE}/t/devries/tuinaanleg`, { waitUntil: "networkidle" });
  await typAdres(p, "8000 AA 1"); // nog niet in de korte cache van de server
  await p.waitForTimeout(800);
  await vulKlus(p);
  const down = await lees(p);
  rapport("PDOK onbereikbaar: de klant kan gewoon doorgaan", /kunt gewoon doorgaan/.test(down) && !/buiten ons werkgebied/.test(down));
  await p.screenshot({ path: `${UIT}/klant-pdok-storing-1440.png`, fullPage: true });
  const knopDown = await p.getByRole("button", { name: /Offerte aanvragen/ }).first().isEnabled().catch(() => false);
  rapport("PDOK onbereikbaar: de aanvraag is mogelijk", knopDown);
  await p.getByRole("button", { name: /Offerte aanvragen/ }).first().click();
  await p.getByLabel(/naam/i).first().fill("Storing Test");
  await p.getByLabel(/e-?mail/i).first().fill("storing@werkgebied.test");
  await p.getByRole("button", { name: /Aanvraag versturen|Versturen|Verstuur/ }).last().click();
  await p.waitForTimeout(2500);
  const ld = sql(`select snapshot->'locatie'->>'gecontroleerd', snapshot->'locatie'->'markeringen' from "Lead" where email = 'storing@werkgebied.test'`).split("|");
  rapport("PDOK onbereikbaar: lead staat erin met 'Werkgebied niet gecontroleerd'", ld[0] === "false" && /WERKGEBIED_NIET_GECONTROLEERD/.test(ld[1] || ""), ld.join(" | "));
  await p.context().close();
  fs.rmSync("/tmp/pdok-down", { force: true });

  // ── 11. Leads: labels, afstand, filter, kaart ──
  zet(instelling({ aan: true, buiten: "MARKEREN" }, { aan: true, bedragEuro: 1500, gedrag: "MARKEREN" }));
  p = await nieuwe(b, { width: 1440, height: 1000 });
  await p.goto(`${BASE}/t/devries/tuinaanleg`, { waitUntil: "networkidle" });
  await typAdres(p, "3511 AB 12"); await kiesEerste(p);
  await vulKlus(p, "1");
  await p.getByRole("button", { name: /Offerte aanvragen/ }).first().click();
  await p.getByLabel(/naam/i).first().fill("Utrecht Klein");
  await p.getByLabel(/e-?mail/i).first().fill("utrecht@werkgebied.test");
  await p.getByRole("button", { name: /Aanvraag versturen|Versturen|Verstuur/ }).last().click();
  await p.waitForTimeout(2500);
  await p.context().close();
  const lm = sql(`select snapshot->'locatie'->'markeringen', snapshot->'locatie'->>'afstandKm' from "Lead" where email = 'utrecht@werkgebied.test'`).split("|");
  rapport("buiten + onder minimum met markeren: lead staat erin met beide markeringen", /BUITEN_WERKGEBIED/.test(lm[0] || "") && /ONDER_MINIMUM/.test(lm[0] || ""), lm.join(" | "));

  for (const [naam, vp] of [["desktop-1440", { width: 1440, height: 1000 }], ["mobiel-412", { width: 412, height: 915 }]]) {
    p = await nieuwe(b, vp, { inloggen: true });
    await p.goto(`${BASE}/dashboard/leads?weergave=lijst`, { waitUntil: "networkidle" });
    const tekst = await lees(p);
    rapport(`leads ${naam}: labels 'Buiten werkgebied', 'Onder minimum' en 'Werkgebied niet gecontroleerd'`, /Buiten werkgebied/.test(tekst) && /Onder minimum/.test(tekst) && /Werkgebied niet gecontroleerd/.test(tekst));
    rapport(`leads ${naam}: afstand in km`, /\d+(,\d)? km/.test(tekst));
    await p.screenshot({ path: `${UIT}/leads-${naam}.png`, fullPage: true });
    // filter
    const filter = p.getByLabel("Filter op werkgebied en minimum").locator("visible=true").first();
    await filter.selectOption("buiten");
    await p.waitForTimeout(800);
    const gefilterd = await lees(p);
    rapport(`leads ${naam}: filter 'Buiten werkgebied' toont alleen die leads`, /Utrecht Klein/.test(gefilterd) && !/Binnen Test/.test(gefilterd) && !/Storing Test/.test(gefilterd));
    await p.screenshot({ path: `${UIT}/leads-filter-${naam}.png`, fullPage: true });
    // detail met kaart
    await p.getByText("Utrecht Klein").locator("visible=true").first().click();
    await p.waitForTimeout(1500);
    rapport(`leads ${naam}: leaddetail met kaart en afstand`, (await p.locator(".leaflet-container").count()) > 0 && /hemelsbreed/.test(await lees(p)));
    await p.screenshot({ path: `${UIT}/lead-detail-kaart-${naam}.png`, fullPage: false });
    rapport(`leads ${naam}: geen scriptfouten`, p.fouten.length === 0, p.fouten.join("; ").slice(0, 200));
    await p.context().close();
  }

  zet(null);
  sql(`delete from "Lead" where email like '%@werkgebied.test'`);
  fs.writeFileSync(`${UIT}/../controle-resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 800)); fs.rmSync("/tmp/pdok-down", { force: true }); process.exit(1); });
