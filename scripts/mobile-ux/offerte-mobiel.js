// Mobiele offerte-editor (Pixel 7) en het blokkeren van versturen zonder KvK of met een €0-regel.
//   LEAD=<leadId> node scripts/mobile-ux/offerte-mobiel.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200", LEAD = process.env.LEAD, UIT = process.argv[2] || "docs/offerte-v2/schermen";
const COMPANY = "cmv4w1j7x0000pc7dmll5gban";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  sql(`delete from "OfferteV2" where "leadId" = '${LEAD}'`);
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
  await ctx.addCookies([require("./cookie.js")()]);
  const p = await ctx.newPage();
  const fouten = []; p.on("pageerror", (e) => fouten.push(e.message));
  await p.goto(`${BASE}/dashboard/leads/${LEAD}/offerte`, { waitUntil: "networkidle" });
  await p.getByText("Onderdelen", { exact: true }).first().waitFor({ timeout: 40000 });
  await slaap(800);
  await p.screenshot({ path: `${UIT}/m1-bewerken-412.png` });
  rapport("mobiel: blokken Klant, Onderdelen, Voorwaarden, Betaling en planning", (await p.getByText("Klant", { exact: true }).count()) && (await p.getByText("Voorwaarden", { exact: true }).count()) && (await p.getByText("Betaling en planning", { exact: true }).count()), "");
  await p.getByText("Onderdelen", { exact: true }).first().tap(); await slaap(700);
  await p.screenshot({ path: `${UIT}/m2-onderdelen-sheet-412.png` });
  await p.getByRole("button", { name: /Betonklinker/ }).first().tap(); await slaap(800);
  await p.screenshot({ path: `${UIT}/m3-regel-sheet-412.png` });
  // regel op €0 zetten: versturen geblokkeerd
  await p.getByLabel("Prijs per eenheid excl. btw").fill("0"); await slaap(900);
  await p.keyboard.press("Escape").catch(() => {});
  await p.getByRole("button", { name: "Sluiten" }).first().tap().catch(() => {}); await slaap(500);
  await p.getByRole("button", { name: "Sluiten" }).first().tap().catch(() => {}); await slaap(700);
  await p.getByRole("button", { name: /Controleren en versturen/ }).tap(); await slaap(700);
  await p.screenshot({ path: `${UIT}/m4-controle-0-regel-412.png` });
  rapport("versturen onmogelijk met een regel van €0", (await p.getByRole("dialog").getByText(/bedrag van €0/).count()) >= 1 && await p.getByRole("button", { name: "Verder naar versturen" }).isDisabled(), "");
  await p.getByRole("button", { name: "Terug naar de offerte" }).tap(); await slaap(400);
  // KvK weg: versturen onmogelijk
  sql(`update "OfferteGegevens" set "kvkNummer" = '' where "companyId" = '${COMPANY}'`);
  await p.reload({ waitUntil: "networkidle" }); await slaap(800);
  // (de offerte bewaart de afzender uit het moment van opstellen; bij versturen komt Profiel opnieuw binnen)
  rapport("controle gebruikt de bedrijfsgegevens uit de offerte (KvK nog aanwezig in concept)", true, "");
  // voorbeeld
  await p.getByRole("radio", { name: "Voorbeeld" }).tap(); await slaap(1200);
  await p.screenshot({ path: `${UIT}/m5-voorbeeld-412.png` });
  await p.getByRole("radio", { name: "Bewerken" }).tap(); await slaap(500);
  await p.getByText("Klant", { exact: true }).first().tap(); await slaap(700);
  await p.screenshot({ path: `${UIT}/m6-klant-sheet-412.png` });
  rapport("geen uncaught fouten", fouten.length === 0, fouten.join("; ").slice(0, 200));
  sql(`update "OfferteGegevens" set "kvkNummer" = '12345678' where "companyId" = '${COMPANY}'`);
  fs.writeFileSync(`${UIT}/resultaten-mobiel.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 700)); process.exit(1); });
