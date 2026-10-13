// Controle van facturen op een draaiende app (lokaal, poort 3200): factuur-editor, definitief maken, delen, online factuurpagina,
// onveranderlijkheid, PDF's. Schermafbeeldingen op 412 × 915 en 1440 px.
//   node scripts/mobile-ux/facturen-controle.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const cookie = require("./cookie.js");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/facturen/schermen";
const C1 = "cmv4w1j7x0000pc7dmll5gban", TOOL = "cmv4w1j8c0002pc7d9mooidkq";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok: Boolean(ok), d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
fs.mkdirSync(UIT, { recursive: true });
const VP = [["mobiel-412", { width: 412, height: 915 }], ["desktop-1440", { width: 1440, height: 1000 }]];

// Opruimen: definitieve facturen kunnen niet verwijderd worden; voor testdata zetten we de triggers even uit.
const ruim = () => sql(`set session_replication_role = replica; delete from "Factuur" where "companyId"='${C1}'; delete from "FactuurNummerTeller" where "companyId"='${C1}'; delete from "OfferteV2" where "companyId"='${C1}'; delete from "Lead" where email in ('a.jansen@example.nl','nieuw@example.nl')`);
const seed = () => JSON.parse(execSync(`DATABASE_URL=postgresql://postgres@127.0.0.1:5433/kp npx tsx scripts/mobile-ux/seed-factuur.ts ${C1} ${TOOL}`, { encoding: "utf8" }).trim().split("\n").pop());
async function pagina(b, vp, pad, inloggen = true) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 600, userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" });
  if (inloggen) await ctx.addCookies([cookie()]);
  const p = await ctx.newPage();
  p.fouten = []; p.on("pageerror", (e) => p.fouten.push(e.message));
  const r = await p.goto(`${BASE}${pad}`, { waitUntil: "networkidle" });
  p.status = r.status();
  return p;
}
const tekst = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  ruim();
  const ids = seed();
  const doc = (p) => ({ innerText: () => p.locator("[data-offerte-document]").first().evaluate((el) => el.innerText + " " + [...el.querySelectorAll("input,textarea")].map((i) => i.value).join(" ")) });

  // ── Concept in de editor ──
  for (const [vn, vp] of VP) {
    const p = await pagina(b, vp, `/dashboard/facturen/${ids.totaal}`);
    if (vp.width < 600) {
      await p.screenshot({ path: `${UIT}/editor-concept-bewerken-${vn}.png`, fullPage: true });
      await p.getByRole("radio", { name: "Voorbeeld" }).click().catch(async () => p.getByText("Voorbeeld", { exact: true }).click());
      await p.waitForTimeout(500);
    }
    rapport(`concept ${vn}: editor toont 'Factuur (concept)' en het document met watermerk`, /Factuur \(concept\)/.test(await tekst(p)) && (await p.locator(".og-watermerk").count()) >= 1);
    rapport(`concept ${vn}: totalen en btw per tarief (21% en 9%)`, /Btw 21%/.test(await doc(p).innerText()) && /Btw 9%/.test(await doc(p).innerText()));
    rapport(`concept ${vn}: stelpost gemarkeerd 'Te bepalen'`, /Te bepalen/.test(await doc(p).innerText()));
    rapport(`concept ${vn}: alleen de door de klant gekozen optionele regel (Verlichting) staat erop`, /Verlichting/.test(await doc(p).innerText()));
    rapport(`concept ${vn}: geen scriptfouten`, p.fouten.length === 0, p.fouten.join("; ").slice(0, 150));
    await p.screenshot({ path: `${UIT}/editor-concept-${vn}.png`, fullPage: vp.width < 600 });
    await p.context().close();
  }

  // ── Definitief maken: eerst controle (niet mogelijk met stelpost zonder hoeveelheid en zonder uitvoeringsdatum) ──
  {
    const p = await pagina(b, VP[1][1], `/dashboard/facturen/${ids.totaal}`);
    await p.getByRole("button", { name: /Definitief maken/ }).click();
    await p.getByRole("dialog").waitFor();
    await p.getByRole("dialog").getByText(/nummer F2026-0001/).waitFor({ timeout: 8000 }).catch(() => {});
    const t = await tekst(p);
    rapport("definitief maken: de controle blokkeert (stelpost, uitvoeringsdatum)", /stelpost/i.test(t) && /uitvoeringsdatum/i.test(t));
    rapport("definitief maken: de knop is uitgeschakeld zolang er blokkades zijn", await p.getByRole("dialog").getByRole("button", { name: "Definitief maken" }).isDisabled());
    rapport("definitief maken: de bevestiging noemt het verwachte nummer", /nummer F2026-0001 en kun je hem niet meer wijzigen/.test(t), (t.match(/Na definitief maken[^.]*\./) || [""])[0]);
    await p.screenshot({ path: `${UIT}/definitief-controle-desktop-1440.png` });
    await p.keyboard.press("Escape");
    // oplossen: uitvoeringsdatum invullen en de hoeveelheid van de stelpost
    await p.locator("[data-offerte-document] .og-meta").click();
    await p.locator("#fm-uitv").fill("2026-10-22");
    const rij = p.locator("[data-offerte-document] tr").filter({ has: p.locator('input[value="Grondwerk en afvoer"]') });
    await rij.locator("td").first().click({ position: { x: 4, y: 4 } });
    const aantal = rij.locator('input[aria-label="Aantal"]');
    await aantal.fill("1,5");
    await p.waitForTimeout(1500);
    const st = await p.getByRole("status").filter({ hasText: /opgeslagen|Opslaan/i }).first().innerText().catch(() => "");
    rapport("concept bewerken: autosave", /opgeslagen/i.test(st), st);
    const db = sql(`select "uitvoeringVan"::text from "Factuur" where id='${ids.totaal}'`);
    rapport("concept bewerken: uitvoeringsdatum staat in de database", db === "2026-10-22", db);
    await p.reload({ waitUntil: "networkidle" });
    await p.getByRole("button", { name: /Definitief maken/ }).click();
    await p.getByRole("dialog").waitFor();
    rapport("definitief maken: na het oplossen is er geen blokkade meer", !(await p.getByRole("dialog").getByRole("button", { name: "Definitief maken" }).isDisabled()));
    await p.getByRole("dialog").getByRole("button", { name: "Definitief maken" }).click();
    await p.getByText(/Factuur F2026-0001 van/).waitFor({ timeout: 60000 });
    rapport("definitief maken: de factuur krijgt nummer F2026-0001 en het delen start", true);
    const f = sql(`select nummer, status, "pdfHash" is not null, "definitiefOp" is not null from "Factuur" where id='${ids.totaal}'`).split("|");
    rapport("definitief maken: nummer, status en PDF-hash staan vast in de database", f[0] === "F2026-0001" && f[1] === "DEFINITIEF" && f[2] === "t" && f[3] === "t", f.join(" | "));
    await p.screenshot({ path: `${UIT}/delen-desktop-1440.png` });
    const link = await p.locator("input,textarea").evaluateAll((els) => els.map((e) => e.value).join(" "));
    const m = link.match(/\/f\/([A-Za-z0-9_-]{20,})/);
    rapport("delen: het bericht bevat de link naar de online factuur, het bedrag, de vervaldatum en het IBAN", Boolean(m) && /vóór/.test(link) && /NL91 ABNA/.test(link) && /F2026-0001/.test(link), (m || [])[0]);
    ids.token = m && m[1];
    await p.getByRole("button", { name: "Ja, verstuurd" }).click();
    await p.getByText(/Factuur staat op Verstuurd/).waitFor({ timeout: 15000 });
    const v = sql(`select status, "verstuurdOp" is not null from "Factuur" where id='${ids.totaal}'`).split("|");
    rapport("na 'Ja, verstuurd': status Verstuurd met datum", v[0] === "VERSTUURD" && v[1] === "t", v.join(" | "));
    await p.getByRole("button", { name: "Klaar" }).click();
    await p.waitForTimeout(1500);
    rapport("een definitieve factuur is in de editor alleen-lezen met uitleg", /definitief en kan niet meer worden gewijzigd/.test(await tekst(p)) && (await p.locator('[data-offerte-document] input[aria-label="Aantal"]').count()) === 0);
    await p.screenshot({ path: `${UIT}/editor-definitief-desktop-1440.png` });
    rapport("definitief maken: geen scriptfouten", p.fouten.length === 0, p.fouten.join("; ").slice(0, 150));
    await p.context().close();
  }

  // ── Online factuurpagina (zonder inloggen) ──
  for (const [vn, vp] of VP) {
    const p = await pagina(b, vp, `/f/${ids.token}`, false);
    const t = await tekst(p);
    rapport(`online factuur ${vn}: bekijken, PDF downloaden en betaalgegevens`, p.status === 200 && /PDF downloaden/.test(t) && /Betaalgegevens/.test(t) && /NL91 ABNA/.test(t) && /F2026-0001/.test(t));
    rapport(`online factuur ${vn}: kopieerknoppen voor IBAN, bedrag en kenmerk`, (await p.getByRole("button", { name: /kopiëren/ }).count()) >= 3);
    await p.screenshot({ path: `${UIT}/online-factuur-${vn}.png`, fullPage: true });
    await p.context().close();
  }
  const bekeken = sql(`select "eersteBekekenOp" is not null from "Factuur" where id='${ids.totaal}'`);
  rapport("de eerste keer openen registreert 'bekeken' (en één regel in de tijdlijn)", bekeken === "t" && sql(`select count(*) from "FactuurGebeurtenis" where "factuurId"='${ids.totaal}' and soort='BEKEKEN'`) === "1");
  {
    const nep = await b.newContext({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" });
    await (await nep.newPage()).goto(`${BASE}/f/${ids.token}`);
    rapport("een linkpreview/bot telt niet als bekeken", sql(`select count(*) from "FactuurGebeurtenis" where "factuurId"='${ids.totaal}' and soort='BEKEKEN'`) === "1");
    const concept = await (await nep.newPage()).goto(`${BASE}/f/${sql(`select token from "Factuur" where id='${ids.termijn}'`)}`);
    rapport("de link van een concept bestaat niet voor de klant (404)", concept.status() === 404);
    await nep.close();
  }

  // ── PDF ──
  {
    const r = await fetch(`${BASE}/f/${ids.token}/pdf`);
    const buf = Buffer.from(await r.arrayBuffer());
    rapport("de online PDF komt exact uit de database (hash klopt)", r.status === 200 && buf.subarray(0, 5).toString() === "%PDF-" && require("crypto").createHash("sha256").update(buf).digest("hex") === sql(`select "pdfHash" from "Factuur" where id='${ids.totaal}'`));
    fs.writeFileSync(`${UIT}/../voorbeeld-factuur-F2026-0001.pdf`, buf);
  }

  // ── Onveranderlijk: via de UI-route (editor) en via directe aanroepen ──
  {
    const nuTotaal = sql(`select "totaalInclCenten" from "Factuur" where id='${ids.totaal}'`);
    for (const q of [`update "Factuur" set "totaalInclCenten" = 1 where id='${ids.totaal}'`, `update "Factuur" set inhoud = '{}' where id='${ids.totaal}'`, `delete from "Factuur" where id='${ids.totaal}'`]) {
      let fout = "";
      try { sql(q); } catch (e) { fout = String(e.stderr || e.message); }
      rapport(`directe database-aanroep wordt geweigerd: ${q.slice(0, 40)}…`, /definitieve factuur/.test(fout), fout.split("\n").find((x) => /ERROR/.test(x)) || "");
    }
    rapport("na de pogingen is de factuur ongewijzigd", sql(`select "totaalInclCenten" from "Factuur" where id='${ids.totaal}'`) === nuTotaal && sql(`select count(*) from "Factuur" where id='${ids.totaal}'`) === "1");
  }


  // ── F5: betalingen, creditnota ──
  {
    const leadId = sql(`select "leadId" from "Factuur" where id='${ids.totaal}'`);
    const p = await pagina(b, VP[1][1], `/dashboard/facturen/${ids.totaal}`);
    rapport("beheerpaneel: status, openstaand en acties voor een verstuurde factuur", /Verstuurd/.test(await tekst(p)) && (await p.getByRole("button", { name: "Betaling registreren" }).count()) === 1 && (await p.getByRole("button", { name: "Crediteren" }).count()) === 1);
    await p.screenshot({ path: `${UIT}/beheer-verstuurd-desktop-1440.png` });
    await p.getByRole("button", { name: "Betaling registreren" }).click();
    await p.getByLabel("Bedrag (€)").fill("500,00");
    await p.getByRole("button", { name: "Betaling opslaan" }).click();
    await p.waitForTimeout(2000);
    rapport("deelbetaling via de UI: status Deels betaald, één betaling in de database", sql(`select status from "Factuur" where id='${ids.totaal}'`) === "DEELS_BETAALD" && sql(`select count(*) from "FactuurBetaling" where "factuurId"='${ids.totaal}'`) === "1" && sql(`select "bedragCenten" from "FactuurBetaling" where "factuurId"='${ids.totaal}'`) === "50000");
    rapport("te veel betalen wordt geweigerd", await (async () => { await p.getByRole("button", { name: "Betaling registreren" }).click(); await p.getByLabel("Bedrag (€)").fill("99999,00"); await p.getByRole("button", { name: "Betaling opslaan" }).click(); await p.waitForTimeout(1500); return /meer dan het openstaande/.test(await tekst(p)); })());
    await p.keyboard.press("Escape");
    await p.screenshot({ path: `${UIT}/beheer-deels-betaald-desktop-1440.png`, fullPage: true });
    await p.getByRole("button", { name: "Crediteren" }).click();
    await p.getByRole("button", { name: "Concept-creditnota maken" }).click();
    await p.waitForURL(/\/dashboard\/facturen\//, { timeout: 8000 });
    await p.waitForTimeout(1500);
    rapport("creditnota: concept met verwijzing naar de oorspronkelijke factuur", sql(`select count(*) from "Factuur" where "creditVoorId"='${ids.totaal}' and status='CONCEPT'`) === "1" && /Creditnota/.test(await tekst(p)));
    await p.screenshot({ path: `${UIT}/creditnota-concept-desktop-1440.png` });
    await p.context().close();

    // ── F6: leads ──
    sql(`insert into "Lead"(id,"companyId","toolId","toolNaamSnapshot",naam,email,snapshot,"totaalIndicatie","updatedAt") select 'lead-nieuw-1', "companyId","toolId","toolNaamSnapshot",'Nieuwe Klant','nieuw@example.nl',snapshot,1234,now() from "Lead" where id='${leadId}'`);
    for (const [vn, vp] of VP) {
      const q = await pagina(b, vp, `/dashboard/leads?lead=lead-nieuw-1`);
      const t = await tekst(q);
      rapport(`leads ${vn}: voortgangsbalk en één volgende actie`, /Stap 1 van 8: Nieuw/.test(t) && (await q.getByRole("button", { name: /Zet op In contact/ }).count()) === 1);
      if (vn === "mobiel-412") {
        await q.screenshot({ path: `${UIT}/lead-nieuw-${vn}.png` });
        await q.getByRole("button", { name: /Zet op In contact/ }).click();
        await q.waitForTimeout(2000);
        rapport("lead: Zet op In contact geeft fase In contact met tijdlijnregel", sql(`select "inContactOp" is not null from "Lead" where id='lead-nieuw-1'`) === "t" && sql(`select count(*) from "LeadGebeurtenis" where "leadId"='lead-nieuw-1' and soort='IN_CONTACT'`) === "1");
        rapport("lead: volgende actie wordt 'Maak een offerte'", /Maak een offerte/.test(await tekst(q)));
        await q.screenshot({ path: `${UIT}/lead-in-contact-${vn}.png` });
        await q.getByRole("button", { name: "Markeer als verloren" }).click();
        await q.getByLabel("Reden").selectOption("Te duur");
        await q.getByRole("button", { name: "Markeer als verloren" }).last().click();
        await q.waitForTimeout(2000);
        rapport("lead: verloren met reden", sql(`select status||'|'||"verlorenReden" from "Lead" where id='lead-nieuw-1'`) === "VERLOREN|Te duur");
        await q.screenshot({ path: `${UIT}/lead-verloren-${vn}.png` });
      } else {
        await q.screenshot({ path: `${UIT}/lead-nieuw-${vn}.png` });
      }
      await q.context().close();
    }
    // gefactureerde lead met openstaand bedrag, daarna te laat
    for (const [vn, vp] of VP) {
      const q = await pagina(b, vp, `/dashboard/leads?lead=${leadId}`);
      rapport(`leads ${vn}: Jansen staat op Gefactureerd met facturen en tijdlijn`, /Stap 7 van 8: Gefactureerd/.test(await tekst(q)) && /Tijdlijn/.test(await tekst(q)));
      await q.screenshot({ path: `${UIT}/lead-gefactureerd-${vn}.png` });
      await q.context().close();
    }
    sql(`set session_replication_role = replica; update "Factuur" set vervaldatum = current_date - 5 where id='${ids.totaal}'`);
    for (const [vn, vp] of VP) {
      const q = await pagina(b, vp, `/dashboard/leads`);
      const t = await tekst(q);
      rapport(`leads ${vn}: filterchips met aantallen, Te laat = 1`, /Te laat 1/.test(t) && /Openstaand 1/.test(t) && /Nieuw \d/.test(t));
      await q.screenshot({ path: `${UIT}/leads-lijst-${vn}.png` });
      await q.getByRole("button", { name: /^Te laat/ }).first().click();
      await q.waitForTimeout(800);
      rapport(`leads ${vn}: filter Te laat toont alleen die lead`, /Jansen/.test(await tekst(q)) && !/Nieuwe Klant/.test(await tekst(q)));
      await q.context().close();
      const d = await pagina(b, vp, `/dashboard`);
      const dt = await tekst(d);
      rapport(`overzicht ${vn}: tellers Te factureren/Openstaand/Te laat en melding '5 dagen te laat'`, /Openstaand/.test(dt) && /5 dagen te laat/.test(dt) && /Herinnering sturen/.test(dt));
      await d.screenshot({ path: `${UIT}/overzicht-${vn}.png`, fullPage: true });
      await d.context().close();
    }
  }

  // ── F7: overzicht en export ──
  {
    for (const [vn, vp] of VP) {
      const p = await pagina(b, vp, `/dashboard/facturen`);
      const t = await tekst(p);
      rapport(`facturenoverzicht ${vn}: lijst, filters, export en boekhoudpakket-melding`, p.status === 200 && /F2026-0001/.test(t) && /CSV downloaden/.test(t) && /geen boekhoudpakket/.test(t));
      await p.screenshot({ path: `${UIT}/facturen-overzicht-${vn}.png`, fullPage: true });
      await p.context().close();
    }
    const ctx = await b.newContext(); await ctx.addCookies([cookie()]);
    const csv = await ctx.request.get(`${BASE}/api/facturen/export?formaat=csv`);
    const txt = await csv.text();
    const regelsCsv = txt.replace("﻿", "").trim().split("\r\n");
    const dbTot = Number(sql(`select coalesce(sum("totaalInclCenten"),0) from "Factuur" where status <> 'CONCEPT'`));
    const kop = regelsCsv[0].split(";"); const ix = kop.indexOf("Totaal incl. btw");
    const som = regelsCsv.slice(1).reduce((s, r) => s + Math.round(Number(r.split(";")[ix].replace(/\./g, "").replace(",", ".")) * 100), 0);
    rapport("export-CSV: totaal incl. btw is gelijk aan de som van de facturen in de database", csv.status() === 200 && som === dbTot, `${som} = ${dbTot}`);
    const zip = await ctx.request.get(`${BASE}/api/facturen/export?formaat=zip&ubl=1`);
    const zb = Buffer.from(await zip.body());
    rapport("export-ZIP: bevat CSV, PDF's en UBL", zip.status() === 200 && zb.subarray(0, 2).toString() === "PK" && zb.includes(Buffer.from("facturen.csv")) && zb.includes(Buffer.from("ubl/F2026-0001.xml")), `${zb.length} bytes`);
    rapport("volledige export zet factuurExportOp", sql(`select "factuurExportOp" is not null from "Company" where id='${C1}'`) === "t");
    fs.writeFileSync(`${UIT}/../voorbeeld-export.csv`, txt);
    await ctx.close();
  }

  fs.writeFileSync(`${UIT}/../controle-resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 900)); process.exit(1); });
