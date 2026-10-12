// E2E offerte v2 (lokaal): wizard → editor → versturen (nep-Brevo) → online offerte → akkoord → getekende PDF.
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
  fs.writeFileSync("/tmp/brevo-mails.jsonl", "");
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

  // 4. controleren en versturen
  await p.getByRole("button", { name: /Controleren en versturen/ }).click();
  await p.getByRole("heading", { name: "Controleren en versturen" }).waitFor();
  await p.screenshot({ path: `${UIT}/04-controle-1440.png` });
  rapport("controle: geen blokkerende punten, waarschuwing zonder algemene voorwaarden", (await p.getByRole("dialog").getByText("Dit moet eerst kloppen").count()) === 0 && (await p.getByRole("dialog").getByText(/algemene voorwaarden bijgevoegd/).count()) === 1, "");
  await p.getByRole("button", { name: "Verder naar versturen" }).click();
  await p.getByText(/versturen naar a\.jansen@example\.nl\?/).waitFor();
  await p.screenshot({ path: `${UIT}/05-bevestigen-1440.png` });
  await p.getByRole("button", { name: /Versturen naar a\.jansen/ }).click();
  await p.getByRole("heading", { name: "Offerte verstuurd" }).waitFor({ timeout: 90000 });
  const link = (await p.locator("p.break-all").innerText()).trim();
  await p.screenshot({ path: `${UIT}/06-verstuurd-1440.png` });
  rapport("offerte verstuurd, link naar online offerte", /\/o\/[A-Za-z0-9_-]{20,}$/.test(link), link);

  // 5. mail
  const mails = fs.readFileSync("/tmp/brevo-mails.jsonl", "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const klantMail = mails.find((m) => m.to?.[0]?.email === "a.jansen@example.nl");
  rapport("e-mail naar de klant met PDF-bijlage en link", !!klantMail && klantMail.attachment?.some((a) => a.pdf === "%PDF-" && a.bytes > 20000) && klantMail.textContent.includes(link), klantMail ? klantMail.subject + " " + JSON.stringify(klantMail.attachment.map((a) => a.name)) : "geen mail");
  rapport("afzendernaam is de handelsnaam, reply-to is de hovenier", klantMail?.sender?.name === "Hoveniersbedrijf De Vries" && !!klantMail?.replyTo?.email, JSON.stringify(klantMail?.replyTo));
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
  await slaap(1500);
  const mails2 = fs.readFileSync("/tmp/brevo-mails.jsonl", "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const bevestiging = mails2.find((x) => /Bevestiging/.test(x.subject));
  const melding = mails2.find((x) => /is akkoord met offerte/.test(x.subject));
  rapport("getekende PDF per e-mail naar de klant", !!bevestiging && bevestiging.to[0].email === "a.jansen@example.nl" && bevestiging.attachment.some((a) => a.pdf === "%PDF-"), bevestiging ? JSON.stringify(bevestiging.attachment.map((a) => a.name)) : "");
  rapport("getekende PDF per e-mail naar de hovenier", !!melding && melding.attachment?.some((a) => a.pdf === "%PDF-"), melding ? melding.to[0].email : "geen melding");
  fs.copyFileSync("/tmp/e2e/getekend.pdf", `${UIT}/getekende-offerte.pdf`);

  // 9. vergrendeld voor de hovenier
  const hctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await hctx.addCookies([require("./cookie.js")()]);
  const h = await hctx.newPage();
  await h.goto(`${BASE}/dashboard/leads/${LEAD}/offerte`, { waitUntil: "networkidle" });
  await h.getByText(/geaccepteerd en definitief vergrendeld/).waitFor({ timeout: 15000 });
  rapport("na akkoord is de offerte vergrendeld in de editor", (await h.getByRole("button", { name: "Nieuwe versie maken" }).count()) === 0, "");
  await h.screenshot({ path: `${UIT}/11-vergrendeld-1440.png` });
  await h.goto(`${BASE}/dashboard/leads`, { waitUntil: "networkidle" });
  await h.screenshot({ path: `${UIT}/12-leads-1440.png` });
  rapport("Leads toont de offertestatus 'Geaccepteerd'", (await h.getByText("Geaccepteerd").count()) >= 1, "");
  rapport("geen uncaught fouten", fouten.length === 0, fouten.join("; ").slice(0, 200));
  fs.writeFileSync(`${UIT}/resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 700)); process.exit(1); });
