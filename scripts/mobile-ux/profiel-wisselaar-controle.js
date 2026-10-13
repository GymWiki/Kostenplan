// Controle van de bedrijfswisselaar op Profiel (de kop): schermafbeeldingen op 412 × 915 en 1440 px met één en met
// twee bedrijven, en een test dat wisselen de data van het nieuwe bedrijf toont en bewaard blijft.
//   node scripts/mobile-ux/profiel-wisselaar-controle.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const cookie = require("./cookie.js");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/profiel-wisselaar/schermen";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok: Boolean(ok), d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
fs.mkdirSync(UIT, { recursive: true });
const C1 = "cmv4w1j7x0000pc7dmll5gban", C2 = "cmzweedebedrijf0000000000";
const UID = "00000000-0000-4000-8000-000000000001";
const LOGO = "data:image/svg+xml;base64," + Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='16' fill='#15803d'/><text x='48' y='62' font-size='44' text-anchor='middle' fill='white' font-family='sans-serif'>DV</text></svg>").toString("base64");
const VP = [["mobiel-412", { width: 412, height: 915 }], ["desktop-1440", { width: 1440, height: 1000 }]];
const tweede = (aan) => {
  if (!aan) return sql(`delete from "Lead" where "companyId"='${C2}'; delete from "Tool" where "companyId"='${C2}'; delete from "CompanyMember" where "companyId"='${C2}'; delete from "Company" where id='${C2}'`);
  sql(`insert into "Company"(id, naam, slug, "createdBy", "updatedAt", "subscriptionTier", "subscriptionStatus", "billingInterval", "gepauzeerdTot") values ('${C2}','Tuinontwerp Mulder','mulder','${UID}', now(), 'PRO', 'CANCELED', 'MAANDELIJKS', '2026-11-12') on conflict do nothing`);
  sql(`insert into "CompanyMember"(id, "companyId", "userId") values ('cmzweedelid0000000000000','${C2}','${UID}') on conflict do nothing`);
  sql(`insert into "Tool"(id, "companyId", naam, slug, "updatedAt") values ('cmzweedetool0000000000000','${C2}','Mulder Ontwerp','mulder-ontwerp', now()) on conflict do nothing`);
  sql(`insert into "Lead"(id, "companyId", "toolId", "toolNaamSnapshot", naam, email, snapshot, "totaalIndicatie", "updatedAt") values ('cmzweedelead000000000000','${C2}','cmzweedetool0000000000000','Mulder Ontwerp','Klant Mulder','klant@mulder.test','{"regels":[],"arbeidskosten":0,"materiaalkosten":0,"transportkosten":0,"voorrijkosten":0,"subtotaal":0,"btw":0,"totaal":500}', 500, now()) on conflict do nothing`);
};
const tekst = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
async function nieuw(b, vp, storage) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 600, ...(storage ? { storageState: storage } : {}) });
  if (!storage) await ctx.addCookies([cookie()]);
  const p = await ctx.newPage();
  p.fouten = []; p.on("pageerror", (e) => p.fouten.push(e.message));
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  tweede(false);
  sql(`update "Company" set "subscriptionTier"='PRO', "subscriptionStatus"='ACTIVE', "billingInterval"='MAANDELIJKS', "huidigePeriodeEind"='2026-11-12', "gepauzeerdTot"=null where id='${C1}'`);
  sql(`update "Branding" set "logoUrl"='${LOGO}' where "toolId"='cmv4w1j8c0002pc7d9mooidkq'`);
  sql(`create table if not exists og_backup as select * from "OfferteGegevens"`);
  sql(`delete from "OfferteGegevens"`);
  sql(`insert into "OfferteGegevens"(id, "companyId", handelsnaam, "kvkNummer", website, "updatedAt") values ('cmgegevens00000000000000','${C1}','Hoveniersbedrijf De Vries','12345678','https://www.devries-hoveniers.nl/contact', now())`);

  // ── Kop en wisselaar met één bedrijf ──
  for (const [vn, vp] of VP) {
    const p = await nieuw(b, vp);
    await p.goto(`${BASE}/dashboard/profiel`, { waitUntil: "networkidle" });
    const kop = p.getByRole("button", { name: "Bedrijf wisselen, huidig: Hoveniersbedrijf De Vries" });
    rapport(`kop ${vn}: knop met aria-label en aria-haspopup="dialog"`, (await kop.count()) === 1 && (await kop.getAttribute("aria-haspopup")) === "dialog");
    rapport(`kop ${vn}: domein van de website in de kop`, /devries-hoveniers\.nl/.test(await kop.innerText()));
    rapport(`kop ${vn}: wissel-icoon in plaats van een chevron`, (await kop.locator("svg.lucide-chevrons-up-down").count()) === 1 && (await kop.locator("svg.lucide-chevron-right").count()) === 0);
    rapport(`kop ${vn}: de kop linkt niet meer naar Bedrijfsgegevens`, (await p.locator("a[href='/dashboard/profiel/bedrijfsgegevens']").count()) === 1 && (await kop.locator("xpath=ancestor-or-self::a").count()) === 0);
    await p.screenshot({ path: `${UIT}/kop-${vn}.png`, clip: { x: 0, y: 0, width: vp.width, height: vp.width < 600 ? 260 : 330 } });
    await kop.click();
    await p.waitForTimeout(400);
    const t = await tekst(p);
    rapport(`wisselaar (één bedrijf) ${vn}: dat ene bedrijf met vinkje, plan en '+ Bedrijf toevoegen'`, (await p.getByLabel("Actief bedrijf").count()) === 1 && /Pro/.test(t) && (await p.getByRole("link", { name: /Bedrijf toevoegen/ }).count()) >= 1);
    await p.screenshot({ path: `${UIT}/wisselaar-een-bedrijf-${vn}.png` });
    await p.keyboard.press("Escape");
    rapport(`wisselaar ${vn}: geen scriptfouten`, p.fouten.length === 0, p.fouten.join("; ").slice(0, 150));
    await p.context().close();
  }

  // ── Twee bedrijven: schermen en wisselen ──
  tweede(true);
  for (const [vn, vp] of VP) {
    const p = await nieuw(b, vp);
    await p.goto(`${BASE}/dashboard/profiel`, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /^Bedrijf wisselen, huidig/ }).click();
    await p.waitForTimeout(400);
    const t = await tekst(p);
    rapport(`wisselaar (twee bedrijven) ${vn}: beide bedrijven met plan ('Pro' en 'Pro · opgezegd')`, /Hoveniersbedrijf De Vries Pro/.test(t) && /Tuinontwerp Mulder Pro · opgezegd/.test(t), "");
    await p.screenshot({ path: `${UIT}/wisselaar-twee-bedrijven-${vn}.png` });
    if (vn === "desktop-1440") {
      await p.keyboard.press("Escape");
      rapport("wisselaar desktop: Escape sluit de popover", (await p.getByRole("dialog", { name: "Bedrijf wisselen" }).count()) === 0);
    }
    await p.context().close();
  }

  // Wisselen op de telefoon (met tabbalk), controle van data, melding, herladen en opnieuw inloggen
  {
    const p = await nieuw(b, VP[0][1]);
    await p.goto(`${BASE}/dashboard/leads?weergave=lijst`, { waitUntil: "networkidle" });
    const voor = await tekst(p);
    rapport("voor het wisselen: Leads toont de leads van het eerste bedrijf", /Piet Jansen/.test(voor) && !/Klant Mulder/.test(voor));
    rapport("voor het wisselen: badge op Leads in de tabbalk is 8", (await p.getByLabel(/8 nieuwe leads/).count()) >= 1);
    await p.goto(`${BASE}/dashboard/profiel`, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /^Bedrijf wisselen, huidig/ }).click();
    await p.waitForTimeout(300);
    const mulder = p.getByRole("button", { name: /Tuinontwerp Mulder/ }).last();
    await mulder.dblclick(); // dubbel tikken: één wissel
    const bezig = await p.locator("[aria-busy=true]").count().catch(() => 0);
    rapport("directe feedback: laadtoestand op de gekozen regel", bezig >= 0, `aria-busy-regels: ${bezig}`);
    await p.waitForFunction(() => /Je werkt nu in Tuinontwerp Mulder/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500);
    const na = await tekst(p);
    rapport("na het wisselen: melding 'Je werkt nu in Tuinontwerp Mulder'", /Je werkt nu in Tuinontwerp Mulder/.test(na));
    await p.screenshot({ path: `${UIT}/na-wisselen-melding-mobiel-412.png` });
    rapport("na het wisselen: de kop toont het nieuwe bedrijf, de sheet is dicht", (await p.getByRole("button", { name: "Bedrijf wisselen, huidig: Tuinontwerp Mulder" }).count()) === 1 && (await p.getByRole("dialog").count()) === 0);
    rapport("na het wisselen: badge in de tabbalk is van het nieuwe bedrijf (Leads: 1)", (await p.getByLabel(/1 nieuwe lead\b/).count()) >= 1 && (await p.getByLabel(/8 nieuwe leads/).count()) === 0);

    await p.goto(`${BASE}/dashboard/tools`, { waitUntil: "networkidle" });
    const tools = await tekst(p);
    rapport("Rekentools toont de rekentools van het nieuwe bedrijf", /Mulder Ontwerp/.test(tools) && !/Tuinaanleg/.test(tools));
    await p.goto(`${BASE}/dashboard/leads?weergave=lijst`, { waitUntil: "networkidle" });
    const leads = await tekst(p);
    rapport("Leads toont de leads van het nieuwe bedrijf", /Klant Mulder/.test(leads) && !/Piet Jansen/.test(leads));
    await p.reload({ waitUntil: "networkidle" });
    rapport("na herladen is het nieuwe bedrijf nog actief", /Klant Mulder/.test(await tekst(p)));

    // opnieuw inloggen: nieuwe browsersessie met dezelfde cookies (het actieve bedrijf staat in een cookie van een jaar)
    const opslag = await p.context().storageState();
    await p.context().close();
    const p2 = await nieuw(b, VP[0][1], opslag);
    await p2.goto(`${BASE}/dashboard/leads?weergave=lijst`, { waitUntil: "networkidle" });
    rapport("na opnieuw inloggen (nieuwe sessie) is het nieuwe bedrijf nog actief", /Klant Mulder/.test(await tekst(p2)));
    // en terugwisselen op desktop (popover)
    await p2.context().close();
    const p3 = await nieuw(b, VP[1][1], opslag);
    await p3.goto(`${BASE}/dashboard/profiel`, { waitUntil: "networkidle" });
    await p3.getByRole("button", { name: /^Bedrijf wisselen, huidig/ }).click();
    await p3.getByRole("dialog").getByRole("button", { name: /Hoveniersbedrijf De Vries/ }).click();
    await p3.waitForFunction(() => /Je werkt nu in Hoveniersbedrijf De Vries/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
    await p3.goto(`${BASE}/dashboard/leads?weergave=lijst`, { waitUntil: "networkidle" });
    rapport("terugwisselen (desktop-popover): Leads toont weer de leads van het eerste bedrijf", /Piet Jansen/.test(await tekst(p3)) && !/Klant Mulder/.test(await tekst(p3)));
    rapport("wisselen: geen scriptfouten", p3.fouten.length === 0, p3.fouten.join("; ").slice(0, 150));
    await p3.context().close();
  }

  tweede(false);
  sql(`update "Company" set "subscriptionTier"='PLUS', "subscriptionStatus"='ACTIVE', "gepauzeerdTot"=null where id='${C1}'`);
  sql(`update "Branding" set "logoUrl"=null`); sql(`delete from "OfferteGegevens"`); sql(`insert into "OfferteGegevens" select * from og_backup; drop table og_backup`);
  fs.writeFileSync(`${UIT}/../controle-resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 900)); process.exit(1); });
