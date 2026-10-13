// Schermafbeeldingen van Profiel → Bedrijf in vier situaties, op 412 × 915 en 1440 px, plus controle dat
// "Bedrijf verwijderen" bij één bedrijf nergens zichtbaar is.   node scripts/mobile-ux/profiel-bedrijf-controle.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const cookie = require("./cookie.js");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/profiel-bedrijf/schermen";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok: Boolean(ok), d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
fs.mkdirSync(UIT, { recursive: true });
const C1 = "cmv4w1j7x0000pc7dmll5gban";
const LOGO = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='16' fill='#15803d'/><text x='48' y='62' font-size='44' text-anchor='middle' fill='white' font-family='sans-serif'>DV</text></svg>");

const zet = (tier, status, extra = "") => sql(`update "Company" set "subscriptionTier"='${tier}', "subscriptionStatus"='${status}', "billingInterval"=${tier === "GRATIS" ? "null" : "'MAANDELIJKS'"}, "huidigePeriodeEind"=${status === "ACTIVE" ? "'2026-11-12'" : "null"}, "gepauzeerdTot"=${status === "CANCELED" ? "'2026-11-12'" : "null"} ${extra} where id='${C1}'`);

const situaties = [
  ["1-een-bedrijf-pro-actief", () => zet("PRO", "ACTIVE")],
  ["2-een-bedrijf-pro-opgezegd", () => zet("PRO", "CANCELED")],
  ["3-een-bedrijf-gratis", () => zet("GRATIS", "GEEN")],
  ["4-twee-bedrijven", () => {
    zet("PRO", "ACTIVE");
    sql(`insert into "Company"(id, naam, slug, "createdBy", "updatedAt") values ('cmzweedebedrijf0000000000','Tuinontwerp Mulder','mulder','00000000-0000-4000-8000-000000000001', now()) on conflict do nothing`);
    sql(`insert into "CompanyMember"(id, "companyId", "userId") values ('cmzweedelid0000000000000','cmzweedebedrijf0000000000','00000000-0000-4000-8000-000000000001') on conflict do nothing`);
  }],
];

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  // logo en website voor het eerste bedrijf (zodat kop en domein te zien zijn)
  sql(`update "Branding" set "logoUrl"='${LOGO}' where "toolId"='cmv4w1j8c0002pc7d9mooidkq'`);
  sql(`insert into "OfferteGegevens"(id, "companyId", website, "updatedAt") values ('cmgegevens00000000000000','${C1}','https://www.devries-hoveniers.nl/contact', now()) on conflict ("companyId") do update set website=excluded.website`);

  for (const [naam, opzet] of situaties) {
    sql(`delete from "CompanyMember" where id='cmzweedelid0000000000000'; delete from "Company" where id='cmzweedebedrijf0000000000'`);
    opzet();
    const meerdere = naam.includes("twee");
    for (const [vn, vp, url] of [["mobiel-412", { width: 412, height: 915 }, "/dashboard/profiel?scherm=bedrijf"], ["desktop-1440", { width: 1440, height: 1000 }, "/dashboard/profiel"]]) {
      const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 600 });
      await ctx.addCookies([cookie()]);
      const p = await ctx.newPage();
      const fouten = []; p.on("pageerror", (e) => fouten.push(e.message));
      await p.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const zichtbaar = (await p.locator("body").innerText());
      const verwijder = await p.getByText("Bedrijf verwijderen").locator("visible=true").count();
      if (meerdere) rapport(`${naam} ${vn}: 'Bedrijf verwijderen' is zichtbaar bij twee bedrijven`, verwijder === 1, String(verwijder));
      else rapport(`${naam} ${vn}: 'Bedrijf verwijderen' is nergens zichtbaar`, verwijder === 0, String(verwijder));
      rapport(`${naam} ${vn}: geen label 'Actief bedrijf'`, !/Actief bedrijf/.test(zichtbaar));
      // tikdoelen minstens 44 px hoog (zichtbare links en knoppen in de Bedrijf-kolom)
      const klein = await p.evaluate(() => [...document.querySelectorAll("section[aria-label] a, section[aria-label] button")].filter((e) => e.offsetParent !== null).map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)]).filter(([, h]) => h < 44));
      rapport(`${naam} ${vn}: alle tikdoelen ≥ 44 px`, klein.length === 0, JSON.stringify(klein.slice(0, 4)));
      rapport(`${naam} ${vn}: geen scriptfouten`, fouten.length === 0, fouten.join("; ").slice(0, 150));
      if (vn.startsWith("desktop")) {
        const kol = await p.evaluate(() => { const el = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "Bedrijf")?.parentElement?.querySelector("a"); return el ? Math.round(el.getBoundingClientRect().width) : null; });
        rapport(`${naam} desktop: kolom is maximaal 640 px breed`, kol !== null && kol <= 640, String(kol));
        const sec = p.locator("section").filter({ has: p.getByRole("heading", { name: "Bedrijf", exact: true }) }).first();
        await sec.scrollIntoViewIfNeeded();
        await sec.screenshot({ path: `${UIT}/${naam}-${vn}.png` });
      } else {
        await p.screenshot({ path: `${UIT}/${naam}-${vn}.png`, fullPage: true });
      }
      if (meerdere && vn.startsWith("mobiel")) {
        await p.getByText("Bedrijf verwijderen").locator("visible=true").first().click();
        await p.waitForTimeout(300);
        await p.screenshot({ path: `${UIT}/${naam}-verwijderen-open-${vn}.png`, fullPage: true });
        const tekst = await p.locator("body").innerText();
        rapport(`${naam}: bevestiging noemt rekentools, leads, offertes en het abonnement`, /rekentools, leads en offertes/.test(tekst) && /abonnement/i.test(tekst));
      }
      await ctx.close();
    }
  }
  sql(`delete from "CompanyMember" where id='cmzweedelid0000000000000'; delete from "Company" where id='cmzweedebedrijf0000000000'`);
  zet("PLUS", "ACTIVE");
  sql(`update "Branding" set "logoUrl"=null`); sql(`delete from "OfferteGegevens" where id='cmgegevens00000000000000'`);
  fs.writeFileSync(`${UIT}/../controle-resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 800)); process.exit(1); });
