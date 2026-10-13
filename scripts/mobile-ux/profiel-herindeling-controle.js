// Controle van de herindeling van Profiel en zijn detailpagina's: schermafbeeldingen op 412 × 915 en 1440 px,
// oude routes, "Bedrijf verwijderen", automatisch opslaan en dubbele instellingen.
//   node scripts/mobile-ux/profiel-herindeling-controle.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const cookie = require("./cookie.js");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/profiel-herindeling/schermen";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok: Boolean(ok), d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
fs.mkdirSync(UIT, { recursive: true });
const C1 = "cmv4w1j7x0000pc7dmll5gban";
const LOGO = "data:image/svg+xml;base64," + Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='16' fill='#15803d'/><text x='48' y='62' font-size='44' text-anchor='middle' fill='white' font-family='sans-serif'>DV</text></svg>").toString("base64");
const VP = [["mobiel-412", { width: 412, height: 915 }], ["desktop-1440", { width: 1440, height: 1000 }]];
const zet = (tier, status) => sql(`update "Company" set "subscriptionTier"='${tier}', "subscriptionStatus"='${status}', "billingInterval"=${tier === "GRATIS" ? "null" : "'MAANDELIJKS'"}, "huidigePeriodeEind"=${status === "ACTIVE" ? "'2026-11-12'" : "null"}, "gepauzeerdTot"=${status === "CANCELED" ? "'2026-11-12'" : "null"} where id='${C1}'`);
const tweede = (aan) => aan
  ? (sql(`insert into "Company"(id, naam, slug, "createdBy", "updatedAt") values ('cmzweedebedrijf0000000000','Tuinontwerp Mulder','mulder','00000000-0000-4000-8000-000000000001', now()) on conflict do nothing`), sql(`insert into "CompanyMember"(id, "companyId", "userId") values ('cmzweedelid0000000000000','cmzweedebedrijf0000000000','00000000-0000-4000-8000-000000000001') on conflict do nothing`))
  : sql(`delete from "CompanyMember" where id='cmzweedelid0000000000000'; delete from "Company" where id='cmzweedebedrijf0000000000'`);

async function pagina(b, vp, pad) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 600 });
  await ctx.addCookies([cookie()]);
  const p = await ctx.newPage();
  p.fouten = []; p.on("pageerror", (e) => p.fouten.push(e.message));
  const r = await p.goto(`${BASE}${pad}`, { waitUntil: "networkidle" });
  p.status = r.status();
  return p;
}
const tekst = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  tweede(false);
  sql(`update "Branding" set "logoUrl"='${LOGO}' where "toolId"='cmv4w1j8c0002pc7d9mooidkq'`);
  sql(`create table if not exists og_backup as select * from "OfferteGegevens"`); // bestaande rij bewaren
  sql(`delete from "OfferteGegevens"`);
  sql(`insert into "OfferteGegevens"(id, "companyId", handelsnaam, "kvkNummer", website, "updatedAt") values ('cmgegevens00000000000000','${C1}','Hoveniersbedrijf De Vries','12345678','https://www.devries-hoveniers.nl/contact', now())`);

  // ── 1-3. Profiel in drie situaties ──
  const situaties = [
    ["1-een-bedrijf-pro-actief", () => { zet("PRO", "ACTIVE"); tweede(false); }],
    ["2-opgezegd", () => { zet("PRO", "CANCELED"); tweede(false); }],
    ["3-twee-bedrijven", () => { zet("PRO", "ACTIVE"); tweede(true); }],
  ];
  for (const [naam, opzet] of situaties) {
    opzet();
    for (const [vn, vp] of VP) {
      const p = await pagina(b, vp, "/dashboard/profiel");
      const t = await tekst(p);
      rapport(`${naam} ${vn}: kop, vier groepen en uitloggen`, /JE BEDRIJF/i.test(t) && /PRIJZEN EN AANVRAGEN/i.test(t) && /ABONNEMENT/i.test(t) && /ACCOUNT/i.test(t) && /Uitloggen/.test(t) && /devries-hoveniers\.nl/.test(t));
      rapport(`${naam} ${vn}: 'Bedrijf verwijderen' staat niet op Profiel`, !/Bedrijf verwijderen/.test(t));
      const rijen = await p.evaluate(() => [...document.querySelectorAll("ul li > a, ul li form button")].filter((e) => e.offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().height)));
      rapport(`${naam} ${vn}: elke regel is ≥ 56 px hoog (${rijen.length} regels)`, rijen.length >= 8 && rijen.every((h) => h >= 56), JSON.stringify(rijen.filter((h) => h < 56)));
      if (naam.startsWith("1")) rapport(`${naam} ${vn}: abonnement 'Pro · verlengt op 12 november'`, /Pro · verlengt op 12 november/.test(t));
      if (naam.startsWith("2")) rapport(`${naam} ${vn}: abonnement 'Pro tot 12 november, daarna Gratis'`, /Pro tot 12 november, daarna Gratis/.test(t));
      if (naam.startsWith("3")) {
        rapport(`${naam} ${vn}: knop 'Wisselen' bij de kop`, (await p.getByRole("button", { name: "Wisselen", exact: true }).count()) === 1);
        await p.getByRole("button", { name: "Wisselen", exact: true }).click();
        await p.waitForTimeout(400);
        const sheet = await tekst(p);
        rapport(`${naam} ${vn}: sheet met bedrijven, vinkje en '+ Bedrijf toevoegen'`, /Tuinontwerp Mulder/.test(sheet) && /Bedrijf toevoegen/.test(sheet) && (await p.getByLabel("Actief bedrijf").count()) === 1);
        await p.screenshot({ path: `${UIT}/${naam}-wisselen-${vn}.png` });
        await p.keyboard.press("Escape");
        await p.waitForTimeout(200);
      }
      await p.screenshot({ path: `${UIT}/${naam}-${vn}.png`, fullPage: true });
      rapport(`${naam} ${vn}: geen scriptfouten`, p.fouten.length === 0, p.fouten.join("; ").slice(0, 150));
      await p.context().close();
    }
  }

  // ── 4. Bedrijfsgegevens met ontbrekende velden (en de waarschuwing op Profiel + badge in de tabbalk) ──
  zet("PRO", "ACTIVE"); tweede(false);
  for (const [vn, vp] of VP) {
    let p = await pagina(b, vp, "/dashboard/profiel");
    const t = await tekst(p);
    const m = t.match(/(\d+) gegevens ontbreken voor offertes/);
    rapport(`ontbrekende gegevens ${vn}: Profiel toont een concrete tekst`, Boolean(m), m && m[0]);
    if (vp.width < 600) rapport(`ontbrekende gegevens ${vn}: oranje badge op het Profiel-icoon in de tabbalk`, (await p.getByLabel(/gegevens ontbreken voor offertes/).count()) === 1);
    await p.context().close();
    p = await pagina(b, vp, "/dashboard/profiel/bedrijfsgegevens");
    await p.screenshot({ path: `${UIT}/4-bedrijfsgegevens-ontbrekend-${vn}.png`, fullPage: true });
    const tb = await tekst(p);
    rapport(`bedrijfsgegevens ${vn}: alle officiële velden op één pagina`, ["Handelsnaam", "Rechtsvorm", "KvK-nummer", "Straat en huisnummer", "Btw-id", "IBAN", "Telefoon", "E-mailadres", "Website", "Contactpersoon"].every((l) => tb.includes(l)));
    rapport(`bedrijfsgegevens ${vn}: geen offerte-instellingen op deze pagina`, !/Introductietekst|Offertenummer|Algemene voorwaarden|Geldigheid in dagen/.test(tb));
    rapport(`bedrijfsgegevens ${vn}: 'Bedrijf verwijderen' niet zichtbaar bij één bedrijf`, !/Bedrijf verwijderen/.test(tb));
    rapport(`bedrijfsgegevens ${vn}: geen scriptfouten`, p.fouten.length === 0, p.fouten.join("; ").slice(0, 150));
    await p.context().close();
  }

  // ── automatisch opslaan ──
  {
    const p = await pagina(b, { width: 1440, height: 1000 }, "/dashboard/profiel/bedrijfsgegevens");
    await p.locator("#og-telefoon").fill("06 99887766");
    await p.locator("#og-handelsnaam").fill("Hoveniersbedrijf De Vries BV");
    await p.waitForTimeout(2500);
    const st = await p.getByRole("status").filter({ hasText: /Opgeslagen|Opslaan/ }).first().innerText().catch(() => "");
    const db = sql(`select telefoon from "OfferteGegevens" where "companyId"='${C1}'`);
    const naam = sql(`select naam from "Company" where id='${C1}'`);
    rapport("automatisch opslaan: status 'Opgeslagen' en waarde in de database", /Opgeslagen/.test(st) && db === "06 99887766", `${st} | ${db}`);
    rapport("automatisch opslaan: bedrijfsnaam volgt de handelsnaam", naam === "Hoveniersbedrijf De Vries BV", naam);
    await p.locator("#og-handelsnaam").fill("Hoveniersbedrijf De Vries");
    await p.waitForTimeout(2500);
    await p.context().close();
  }

  // ── 5. Offerte-instellingen ──
  for (const [vn, vp] of VP) {
    const p = await pagina(b, vp, "/dashboard/profiel/offerte-instellingen");
    await p.screenshot({ path: `${UIT}/5-offerte-instellingen-${vn}.png`, fullPage: true });
    const t = await tekst(p);
    rapport(`offerte-instellingen ${vn}: nummering, geldigheid, betaling, teksten, voorwaarden, herroeping`, ["Voorvoegsel offertenummer", "Geldigheid in dagen", "Betaalvoorwaarden", "Introductietekst", "Slottekst", "Voorwaarden en uitsluitingen", "Herroepingsrecht", "Algemene voorwaarden", "Bericht bij een nieuwe offerte"].every((l) => t.includes(l)));
    rapport(`offerte-instellingen ${vn}: geen bedrijfsgegevens op deze pagina`, !/KvK-nummer|Handelsnaam|IBAN|Btw-id/.test(t.replace(/Btw per soort regel/g, "")));
    await p.context().close();
  }
  // één van de andere detailpagina's, ter controle van de opmaak
  for (const [naam, pad] of [["tarieven", "/dashboard/profiel/tarieven"], ["werkgebied", "/dashboard/profiel/werkgebied"], ["abonnement", "/dashboard/profiel/abonnement"], ["huisstijl", "/dashboard/profiel/huisstijl"], ["account", "/dashboard/profiel/account"]]) {
    for (const [vn, vp] of VP) {
      const p = await pagina(b, vp, pad);
      rapport(`${naam} ${vn}: pagina laadt (${p.status})`, p.status === 200 && p.fouten.length === 0, p.fouten.join("; ").slice(0, 120));
      if (vn === "mobiel-412" || naam === "tarieven") await p.screenshot({ path: `${UIT}/detail-${naam}-${vn}.png`, fullPage: true });
      await p.context().close();
    }
  }
  // 'Bedrijf verwijderen' bij twee bedrijven, onderaan Bedrijfsgegevens
  tweede(true);
  for (const [vn, vp] of VP) {
    const p = await pagina(b, vp, "/dashboard/profiel/bedrijfsgegevens");
    rapport(`twee bedrijven ${vn}: 'Bedrijf verwijderen' onderaan Bedrijfsgegevens`, (await p.getByText("Bedrijf verwijderen").locator("visible=true").count()) === 1);
    if (vn === "mobiel-412") {
      await p.getByText("Bedrijf verwijderen").locator("visible=true").first().click();
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${UIT}/6-bedrijf-verwijderen-${vn}.png`, fullPage: true });
    }
    await p.context().close();
  }
  tweede(false);

  // ── oude routes ──
  const oud = [
    ["/dashboard/abonnement", "/dashboard/profiel/abonnement"],
    ["/dashboard/abonnement?checkout=afgerond", "/dashboard/profiel/abonnement?checkout=afgerond"],
    ["/dashboard/branding", "/dashboard/profiel/huisstijl"],
    ["/dashboard/profiel?scherm=bedrijf", "/dashboard/profiel/bedrijfsgegevens"],
    ["/dashboard/profiel?scherm=bedrijfsgegevens", "/dashboard/profiel/bedrijfsgegevens"],
    ["/dashboard/profiel?scherm=offertegegevens", "/dashboard/profiel/bedrijfsgegevens"],
    ["/dashboard/profiel?scherm=uiterlijk", "/dashboard/profiel/huisstijl"],
    ["/dashboard/profiel?scherm=tarieven", "/dashboard/profiel/tarieven"],
    ["/dashboard/profiel?scherm=werkgebied", "/dashboard/profiel/werkgebied"],
    ["/dashboard/profiel?scherm=abonnement", "/dashboard/profiel/abonnement"],
    ["/dashboard/profiel?scherm=account", "/dashboard/profiel/account"],
  ];
  for (const [van, naar] of oud) {
    const p = await pagina(b, { width: 1440, height: 900 }, van);
    const eind = new URL(p.url()); const verwacht = new URL(`${BASE}${naar}`);
    rapport(`oude route ${van} → ${naar}`, p.status === 200 && eind.pathname === verwacht.pathname && eind.search === verwacht.search, `${eind.pathname}${eind.search} (${p.status})`);
    await p.context().close();
  }

  // ── dubbele instellingen: geen formulierveld op meer dan één instellingenpagina ──
  const paginas = ["bedrijfsgegevens", "huisstijl", "tarieven", "werkgebied", "offerte-instellingen", "abonnement", "account"];
  const velden = {};
  for (const pg of paginas) {
    const p = await pagina(b, { width: 1440, height: 1000 }, `/dashboard/profiel/${pg}`);
    const labels = await p.evaluate(() => [...document.querySelectorAll("main input:not([type=hidden]):not([type=file]), main select, main textarea")].filter((e) => e.closest("[aria-hidden=true]") === null).map((e) => (e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : null) || e.getAttribute("aria-label") || e.name || e.id).filter(Boolean).map((t) => t.trim()));
    velden[pg] = labels;
    await p.context().close();
  }
  const teller = {};
  for (const [pg, ls] of Object.entries(velden)) for (const l of new Set(ls)) (teller[l] = teller[l] || []).push(pg);
  const dubbel = Object.entries(teller).filter(([, pgs]) => pgs.length > 1);
  rapport("geen instelling is op meer dan één instellingenpagina bewerkbaar", dubbel.length === 0, JSON.stringify(dubbel));
  fs.writeFileSync(`${UIT}/../velden-per-pagina.json`, JSON.stringify(velden, null, 2));

  tweede(false); zet("PLUS", "ACTIVE");
  sql(`update "Branding" set "logoUrl"=null`); sql(`delete from "OfferteGegevens"`); sql(`insert into "OfferteGegevens" select * from og_backup; drop table og_backup`);
  fs.writeFileSync(`${UIT}/../controle-resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 900)); process.exit(1); });
