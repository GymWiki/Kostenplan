// E2E offerte v2 (lokaal): wizard → editor → delen via eigen mail/app → online offerte → akkoord → getekende PDF.
//   LEAD=<leadId> node scripts/mobile-ux/offerte-e2e.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200";
const LEAD = process.env.LEAD;
const UIT = process.argv[2] || "docs/offerte-v2/schermen";
const COMPANY = "cmv4w1j7x0000pc7dmll5gban";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(UIT, { recursive: true });
fs.mkdirSync("/tmp/e2e", { recursive: true });

(async () => {
  // schone start
  sql(`delete from "OfferteV2" where "leadId" = '${LEAD}'`);
  sql(`delete from "OfferteGegevens" where "companyId" = '${COMPANY}'`);
  sql(`delete from "OfferteNummerTeller" where "companyId" = '${COMPANY}'`);
  sql(`update "Lead" set status = 'NIEUW' where id = '${LEAD}'`);
  try { fs.unlinkSync("/tmp/brevo-mails.jsonl"); } catch {}
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addCookies([require("./cookie.js")()]);
  const p = await ctx.newPage();
  const fouten = []; p.on("pageerror", (e) => fouten.push(e.message));

  // 1. wizard
  await p.goto(`${BASE}/dashboard/leads/${LEAD}/offerte`, { waitUntil: "networkidle" });
  await p.getByRole("dialog").waitFor({ timeout: 15000 });
  rapport("wizard verschijnt met alleen ontbrekende gegevens", (await p.getByLabel("KvK-nummer").count()) === 1 && (await p.getByLabel("Plaats").count()) === 1, "");
  await p.screenshot({ path: `${UIT}/01-wizard-1440.png` });
  await p.getByLabel("KvK-nummer").fill("1234 5678");
  await p.getByLabel("Straat en huisnummer").fill("Dennenlaan 12");
  await p.getByLabel("Postcode").fill("3511ab");
  await p.getByLabel("Plaats").fill("Utrecht");
  await p.getByLabel("Btw-id").fill("nl123456789b01");
  await p.getByLabel("IBAN", { exact: true }).fill("NL91 ABNA 0417 1643 00");
  await p.getByLabel("Ten name van").fill("Hoveniersbedrijf De Vries").catch(() => {});
  if (await p.getByLabel("Telefoon").count()) await p.getByLabel("Telefoon").fill("06 12345678");
  if (await p.getByLabel("Contactpersoon").count()) await p.getByLabel("Contactpersoon").fill("Jan de Vries");
  await p.getByRole("button", { name: "Opslaan en doorgaan" }).click();
  await p.waitForSelector("[data-offerte-document]", { timeout: 40000 });
  await slaap(1500);

  // 2. editor
  const nummer = await p.locator("h1", { hasText: /Offerte \d{4}-/ }).first().innerText();
  rapport("editor opent met offertenummer 2026-0001", /Offerte \d{4}-0001/.test(nummer), nummer);
  await p.screenshot({ path: `${UIT}/02-editor-1440.png` });
  const docTekst = () => p.locator("[data-offerte-document]").evaluate((el) => el.innerText + " " + [...el.querySelectorAll("input,textarea")].map((i) => i.value).join(" "));
  const doc = await docTekst();
  rapport("losse regels: materiaal, arbeid, voorrijkosten en transport", /Betonklinker/.test(doc) && /Straatzand/.test(doc) && /Arbeid/.test(doc) && /Voorrijkosten/.test(doc) && /Transport/.test(doc), "");
  rapport("geen samengevoegde restpost", !/Materiaal- en overige kosten/.test(doc), "");
  const totaalTekst = await p.locator("[data-offerte-document] .og-totaal .eind").innerText();
  const bedrag = Number(totaalTekst.replace(/[^\d,]/g, "").replace(",", "."));
  const leadTotaal = Number(sql(`select "totaalIndicatie" from "Lead" where id = '${LEAD}'`));
  rapport("totaal gelijk aan wat de klant in de rekentool zag", Math.abs(bedrag - leadTotaal) < 0.06, `${bedrag} vs ${leadTotaal.toFixed(2)}`);

  // 3. bewerken + autosave: regel toevoegen als optioneel
  await p.locator("tr.og-sectiekop td.r").first().click();
  await slaap(300);
  await p.locator("aside").getByRole("button", { name: "Regel toevoegen" }).click();
  await slaap(300);
  await p.locator("aside").getByLabel("Omschrijving").fill("Hagenmest bij planten");
  await p.locator("aside").getByLabel("Soort regel").selectOption("optioneel");
  await p.locator("aside").getByLabel("Prijs per eenheid excl. btw").fill("45");
  await p.locator("aside").getByLabel("Aantal", { exact: true }).fill("1");
  await slaap(1500);
  await p.getByText("Alles opgeslagen").first().waitFor({ timeout: 10000 });
  await p.screenshot({ path: `${UIT}/03-regel-bewerken-1440.png` });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector("[data-offerte-document]");
  rapport("wijziging is automatisch opgeslagen", /Hagenmest bij planten/.test(await docTekst()), "");

  // 4. versturen: controle → delen (eigen mail/app) → "Is de offerte verstuurd?"
  const LEAD2 = process.env.LEAD2;
  await p.getByRole("button", { name: /^Versturen/ }).first().click();
  await p.getByRole("heading", { name: "Controleren en versturen" }).waitFor();
  await p.screenshot({ path: `${UIT}/04-controle-1440.png` });
  rapport("controle: geen blokkerende punten, waarschuwing zonder algemene voorwaarden", (await p.getByRole("dialog").getByText("Dit moet eerst kloppen").count()) === 0 && (await p.getByRole("dialog").getByText(/algemene voorwaarden bijgevoegd/).count()) === 1, "");
  await p.getByRole("button", { name: "Verder naar versturen" }).click();
  await p.getByRole("heading", { name: /^Offerte .* versturen$/ }).waitFor({ timeout: 90000 });
  await p.getByRole("link", { name: "Mail openen" }).waitFor();
  await p.screenshot({ path: `${UIT}/05-delen-1440.png` });
  const token = sql(`select token from "OfferteV2" where "leadId" = '${LEAD}'`);
  const link = `${BASE}/o/${token}`;
  const mailto = await p.getByRole("link", { name: "Mail openen" }).getAttribute("href");
  const mu = new URL(mailto.replace("mailto:", "http://x/"));
  const ontvanger = decodeURIComponent(mailto.slice(7).split("?")[0]);
  const onderwerp = mu.searchParams.get("subject") || "";
  const body = mu.searchParams.get("body") || "";
  rapport("desktop: mailto naar de klant met onderwerp 'Offerte 2026-0001 – …'", ontvanger === "a.jansen@example.nl" && /^Offerte \d{4}-0001 – .+/.test(onderwerp), `${ontvanger} | ${onderwerp}`);
  rapport("desktop: mailtekst bevat de link naar de online offerte", body.includes(`/o/${token}`), body.slice(0, 80));
  rapport("desktop: PDF downloaden, link kopiëren en WhatsApp aanwezig", (await p.getByRole("link", { name: "PDF downloaden" }).count()) === 1 && (await p.getByRole("button", { name: /Link kopiëren/ }).count()) === 1 && /wa\.me/.test((await p.getByRole("link", { name: "Delen via WhatsApp" }).getAttribute("href")) || ""), "");
  const pdfDl = await ctx.request.get(BASE + (await p.getByRole("link", { name: "PDF downloaden" }).getAttribute("href")));
  const pdfBytes = await pdfDl.body();
  rapport("PDF te downloaden (echte PDF)", pdfBytes.subarray(0, 5).toString() === "%PDF-" && pdfBytes.length > 20000, String(pdfBytes.length));
  // Nee → blijft concept
  await p.getByRole("button", { name: "Nee, nog niet" }).click();
  await p.getByRole("heading", { name: /blijft een concept/ }).waitFor();
  const naNee = sql(`select status from "OfferteV2" where "leadId" = '${LEAD}'`);
  rapport("antwoord 'Nee' laat de offerte een concept (niets automatisch aangenomen)", naNee === "CONCEPT", naNee);
  await p.getByRole("button", { name: "Terug" }).click();

  // Android-Chrome (Web Share met bestanden) en iOS-Safari (alleen tekst + link): eigen contexten op dezelfde concept-offerte
  const maakShareContext = async (naam, ua, bestanden) => {
    const c = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua });
    await c.addCookies([require("./cookie.js")()]);
    await c.addInitScript((kanBestanden) => {
      window.__gedeeld = null;
      Object.defineProperty(navigator, "canShare", { configurable: true, value: (d) => !(d && d.files) || kanBestanden });
      Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__gedeeld = { title: d.title, text: d.text, bestanden: (d.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })) }; } });
    }, bestanden);
    const mp = await c.newPage();
    await mp.goto(`${BASE}/dashboard/leads/${LEAD}/offerte`, { waitUntil: "networkidle" });
    await mp.getByRole("button", { name: /^Versturen/ }).first().click();
    await mp.getByRole("button", { name: "Verder naar versturen" }).click();
    await mp.getByRole("button", { name: "Delen (met PDF)" }).waitFor({ timeout: 90000 });
    await mp.screenshot({ path: `${UIT}/05b-delen-${naam}.png` });
    await mp.getByRole("button", { name: "Delen (met PDF)" }).tap();
    await slaap(1500);
    const gedeeld = await mp.evaluate(() => window.__gedeeld);
    await c.close();
    return gedeeld;
  };
  const android = await maakShareContext("android-412", "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", true);
  rapport("Android-Chrome: deelmenu met de PDF als bestand, onderwerp en link", !!android && android.bestanden.length === 1 && android.bestanden[0].type === "application/pdf" && android.bestanden[0].size > 20000 && /\.pdf$/.test(android.bestanden[0].name) && /^Offerte \d{4}-0001 – /.test(android.title) && android.text.includes(`/o/${token}`), JSON.stringify(android && { ...android, text: undefined }));
  const ios = await maakShareContext("ios-390", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", false);
  rapport("iOS-Safari zonder bestandsdeling: alleen tekst + link", !!ios && ios.bestanden.length === 0 && ios.text.includes(`/o/${token}`), JSON.stringify(ios && { ...ios, text: undefined }));
  const naShare = sql(`select status from "OfferteV2" where "leadId" = '${LEAD}'`);
  rapport("delen alleen (zonder 'Ja') verandert de status niet", naShare === "CONCEPT", naShare);

  // Ja → Verstuurd
  await p.getByRole("button", { name: "Ja, verstuurd" }).click();
  await p.getByRole("heading", { name: "Offerte staat op Verstuurd" }).waitFor({ timeout: 30000 });
  await p.screenshot({ path: `${UIT}/06-verstuurd-1440.png` });
  const verstuurd = sql(`select status, "verstuurdOp" is not null from "OfferteV2" where "leadId" = '${LEAD}'`);
  rapport("na 'Ja' staat de offerte op Verstuurd met verzenddatum", verstuurd === "VERSTUURD|t", verstuurd);
  await p.getByRole("button", { name: "Klaar" }).click();
  await slaap(1500);
  rapport("na sluiten is de offerte vergrendeld (nieuwe versie maken beschikbaar)", (await p.getByRole("button", { name: "Nieuwe versie maken" }).count()) >= 1, "");
  await p.screenshot({ path: `${UIT}/06b-vergrendeld-na-verzenden-1440.png` });
  await ctx.close();

  // 6. DB: vergrendeld
  const v = sql(`select vergrendeld, "pdfHash" is not null from "OfferteVersie" v join "OfferteV2" o on o.id = v."offerteId" where o."leadId" = '${LEAD}' and versie = 1`);
  rapport("verstuurde versie is vergrendeld met PDF-hash", v === "t|t", v);

  // 7. online offerte op mobiel (Pixel 7)
  const mctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
  const m = await mctx.newPage();
  await m.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
  await slaap(800);
  await m.screenshot({ path: `${UIT}/07-online-412.png` });
  rapport("online offerte toont onderwerp en totaal", (await m.getByText("Totaal incl. btw").count()) >= 1, "");
  const eerst = sql(`select status from "OfferteV2" where "leadId" = '${LEAD}'`);
  rapport("eerste keer openen registreert 'Bekeken'", eerst === "BEKEKEN", eerst);
  const voor = await m.locator("span.tabular-nums").last().innerText().catch(() => "");
  await m.getByLabel(/Hagenmest bij planten kiezen/).check();
  await slaap(300);
  await m.screenshot({ path: `${UIT}/08-online-optioneel-412.png` });
  // 8. akkoord
  await m.getByRole("button", { name: "Akkoord geven" }).first().tap();
  await m.getByRole("heading", { name: "Akkoord geven" }).waitFor();
  await m.getByRole("button", { name: "Bevestigen" }).tap();
  await m.getByText(/vink aan dat je akkoord/i).waitFor();
  rapport("akkoord zonder vinkje wordt geweigerd", true, "");
  await m.getByLabel("Je volledige naam").fill("A. Jansen");
  await m.getByLabel(/Ik ga akkoord met deze offerte/).check();
  await m.screenshot({ path: `${UIT}/09-akkoord-412.png` });
  await m.getByRole("button", { name: "Bevestigen" }).tap();
  await m.getByText(/Akkoord gegeven door A\. Jansen/).waitFor({ timeout: 60000 });
  await m.screenshot({ path: `${UIT}/10-akkoord-klaar-412.png` });
  rapport("akkoord op mobiel gelukt", true, "");

  const ak = sql(`select naam, ip is not null, "userAgent" like '%Pixel 7%', "versieNummer", length("pdfHash"), "getekendePdfData" is not null, "gekozenRegelIds"::text like '%r%' from "OfferteAkkoord" a join "OfferteV2" o on o.id = a."offerteId" where o."leadId" = '${LEAD}'`);
  rapport("audittrail: naam, IP, user-agent, versie, hash van de PDF, getekende PDF", /^A\. Jansen\|t\|t\|1\|64\|t\|t$/.test(ak), ak);
  const st = sql(`select status from "OfferteV2" where "leadId" = '${LEAD}'`) + "|" + sql(`select status from "Lead" where id = '${LEAD}'`);
  rapport("status Geaccepteerd; lead Gewonnen", st === "GEACCEPTEERD|GEWONNEN", st);

  // getekende PDF + mails
  const pdfRes = await mctx.request.get(`${link.replace(/^https?:\/\/[^/]+/, BASE)}/pdf?getekend=1`);
  const pdfBuf = await pdfRes.body();
  fs.writeFileSync("/tmp/e2e/getekend.pdf", pdfBuf);
  const tekst = execSync("pdftotext -layout /tmp/e2e/getekend.pdf -", { encoding: "utf8" });
  rapport("getekende PDF bevat naam en tijdstip van het akkoord", pdfBuf.subarray(0, 5).toString() === "%PDF-" && /A\. Jansen/.test(tekst) && /\bom \d{2}:\d{2}/.test(tekst), "");
  const geenMailLog = !fs.existsSync("/tmp/brevo-mails.jsonl");
  rapport("er is geen mailverkeer nodig: geen BREVO_API_KEY/CRON_SECRET in de omgeving van de app", !process.env.BREVO_API_KEY && !process.env.CRON_SECRET && geenMailLog, "");
  const dl = await mctx.newPage();
  await dl.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
  rapport("klant ziet na akkoord de bevestiging met download van de getekende PDF", (await dl.getByRole("link", { name: /Getekende PDF|Download/i }).count()) >= 1, "");
  fs.copyFileSync("/tmp/e2e/getekend.pdf", `${UIT}/getekende-offerte.pdf`);

  // 9. vergrendeld voor de hovenier
  const hctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await hctx.addCookies([require("./cookie.js")()]);
  const h = await hctx.newPage();
  await h.goto(`${BASE}/dashboard/leads/${LEAD}/offerte`, { waitUntil: "networkidle" });
  await h.getByText(/geaccepteerd en definitief vergrendeld/).waitFor({ timeout: 15000 });
  rapport("na akkoord is de offerte vergrendeld in de editor", (await h.getByRole("button", { name: "Nieuwe versie maken" }).count()) === 0, "");
  await h.screenshot({ path: `${UIT}/11-vergrendeld-1440.png` });
  rapport("hovenier ziet de activiteit (akkoord) bij de offerte", (await h.getByText("Akkoord van de klant").count()) >= 1 && (await h.getByRole("link", { name: "Getekende PDF" }).count()) >= 1, "");
  await h.goto(`${BASE}/dashboard/leads`, { waitUntil: "networkidle" });
  await h.screenshot({ path: `${UIT}/12-leads-1440.png` });
  rapport("Leads toont de offertestatus 'Geaccepteerd'", (await h.getByText("Geaccepteerd").count()) >= 1, "");

  // 10. verlopen: server-side afgeleid, zonder cron
  if (LEAD2) {
    sql(`delete from "OfferteV2" where "leadId" = '${LEAD2}'`);
    const bron = sql(`select id from "OfferteV2" where "leadId" = '${LEAD}'`);
    sql(`insert into "OfferteV2"(id,"companyId","leadId",nummer,token,status,"huidigeVersie","verstuurdOp","geldigTot","reactieGezien","createdAt","updatedAt") select 'e2eexp1',"companyId",'${LEAD2}','2026-9001','e2eexptoken0123456789abcdef','VERSTUURD',1,now()-interval '10 days',current_date+5,true,now(),now() from "OfferteV2" where id='${bron}'; create temp table v as select * from "OfferteVersie" where "offerteId"='${bron}'; update v set id='e2eexpv1',"offerteId"='e2eexp1',vergrendeld=true,inhoud=jsonb_set(jsonb_set(inhoud,'{geldigTot}',to_jsonb((current_date+5)::text)),'{nummer}','"2026-9001"'); insert into "OfferteVersie" select * from v;`);
    // Tip "Herinnering sturen": 10 dagen verstuurd zonder reactie
    await h.goto(`${BASE}/dashboard/leads`, { waitUntil: "networkidle" });
    rapport("tip 'Herinnering sturen' verschijnt (10 dagen zonder reactie)", (await h.getByRole("link", { name: /Herinnering sturen/ }).count()) >= 1, "");
    await h.screenshot({ path: `${UIT}/13-herinnering-tip-1440.png` });
    await h.getByRole("link", { name: /Herinnering sturen/ }).first().click();
    await h.getByRole("heading", { name: /Herinnering sturen voor offerte/ }).waitFor({ timeout: 90000 });
    const hm = await h.getByRole("link", { name: "Mail openen" }).getAttribute("href");
    rapport("herinnering opent dezelfde deelflow met herinneringstekst", /subject=/.test(hm) && /herinner|nog/i.test(decodeURIComponent(hm)), decodeURIComponent(hm).slice(0, 120));
    await h.screenshot({ path: `${UIT}/14-herinnering-1440.png` });
    // Verlopen: eerst geldig openen, dan in de database 'gisteren' zetten; akkoord moet server-side falen
    const vm = await mctx.newPage();
    await vm.goto(`${BASE}/o/e2eexptoken0123456789abcdef`, { waitUntil: "networkidle" });
    await vm.getByRole("button", { name: "Akkoord geven" }).first().waitFor();
    sql(`update "OfferteV2" set "geldigTot" = current_date - 1 where id = 'e2eexp1'; update "OfferteVersie" set inhoud = jsonb_set(inhoud,'{geldigTot}',to_jsonb((current_date - 1)::text)) where id = 'e2eexpv1'`);
    await vm.getByRole("button", { name: "Akkoord geven" }).first().tap();
    await vm.getByLabel("Je volledige naam").fill("Te Laat");
    await vm.getByLabel(/Ik ga akkoord met deze offerte/).check();
    await vm.getByRole("button", { name: "Bevestigen" }).tap();
    await slaap(2500);
    const naPoging = sql(`select status from "OfferteV2" where id = 'e2eexp1'`) + "|" + sql(`select count(*) from "OfferteAkkoord" where "offerteId" = 'e2eexp1'`);
    rapport("akkoord na de geldig-tot-datum wordt server-side geweigerd", /^(VERSTUURD|BEKEKEN)\|0$/.test(naPoging), naPoging);
    await vm.screenshot({ path: `${UIT}/15-verlopen-akkoord-geweigerd-412.png` });
    await vm.reload({ waitUntil: "networkidle" });
    rapport("klant ziet 'Verlopen' en kan niet meer akkoord geven", (await vm.getByText(/verlopen/i).count()) >= 1 && (await vm.getByRole("button", { name: "Akkoord geven" }).count()) === 0, "");
    await vm.screenshot({ path: `${UIT}/16-verlopen-412.png` });
    await h.goto(`${BASE}/dashboard/leads`, { waitUntil: "networkidle" });
    rapport("Leads toont 'Verlopen' voor de verlopen offerte", (await h.getByText("Verlopen").count()) >= 1, "");
    sql(`delete from "OfferteV2" where id = 'e2eexp1'`);
  }
  rapport("geen uncaught fouten", fouten.length === 0, fouten.join("; ").slice(0, 200));
  fs.writeFileSync(`${UIT}/resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 700)); process.exit(1); });
