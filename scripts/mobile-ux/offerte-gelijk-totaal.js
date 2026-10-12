// Controle: de offerte uit een aanvraag toont exact hetzelfde totaal als de klant in de rekentool zag.
//   LEAD=<leadId> node scripts/mobile-ux/offerte-gelijk-totaal.js [uitmap]
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200";
const LEAD = process.env.LEAD;
const UIT = process.argv[2] || "docs/pricing-engine/schermen";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
fs.mkdirSync(UIT, { recursive: true });
(async () => {
  const klantCenten = Number(sql(`select snapshot->'rekenkern'->'resultaat'->>'totaalInclCenten' from "Lead" where id = '${LEAD}'`));
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([require("./cookie.js")()]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/dashboard/leads/${LEAD}/offerte`, { waitUntil: "networkidle" });
  if (await p.getByRole("dialog").count()) {
    console.log("wizard zichtbaar: eerst offertegegevens aanvullen");
    process.exit(2);
  }
  await p.waitForSelector("[data-offerte-document]", { timeout: 40000 });
  await p.waitForTimeout(1200);
  const t = await p.locator("[data-offerte-document] .og-totaal .eind").innerText();
  const offerteCenten = Math.round(Number(t.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
  const regels = await p.locator("[data-offerte-document] tbody tr").count();
  await p.screenshot({ path: `${UIT}/offerte-uit-aanvraag-1440.png` });
  console.log(`${offerteCenten === klantCenten ? "PASS" : "FAIL"}  offertetotaal ${offerteCenten / 100} = klanttotaal ${klantCenten / 100}  (${regels} tabelrijen)`);
  await b.close();
  process.exit(offerteCenten === klantCenten ? 0 : 1);
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 600)); process.exit(1); });
