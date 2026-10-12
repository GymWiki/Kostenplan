// Controle van de rekenkern op een draaiende app (lokaal): de klant vult de rekentool in, vraagt een offerte
// aan, en de server bewaart zijn eigen berekening. Ook een aanvraag met een verknoeid bedrag wordt rechtgezet.
//   node scripts/mobile-ux/aanvraag-rekenkern.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/pricing-engine/schermen";
const TOOL = "cmv4w1j8c0002pc7d9mooidkq";
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
const bedrag = (t) => Math.round(Number(t.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
fs.mkdirSync(UIT, { recursive: true });

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const fouten = []; p.on("pageerror", (e) => fouten.push(e.message));
  await p.goto(`${BASE}/t/devries/tuinaanleg`, { waitUntil: "networkidle" });

  // Schutting 20 m, een ander materiaal kiezen; vlonder 6 × 4 m
  await p.getByLabel("Aantal Schutting").fill("20");
  const selects = p.locator("select");
  await selects.first().selectOption({ index: 2 });
  await p.locator("#sv-lengte").fill("6");
  await p.locator("#sv-breedte").fill("4");
  await p.waitForTimeout(400);
  const vlonderSelect = p.locator("select").nth(1);
  if (await vlonderSelect.count()) await vlonderSelect.selectOption({ index: 1 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${UIT}/klant-rekentool-1280.png`, fullPage: false });

  const kaart = p.locator("text=Jouw kostenraming").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  const kaartTekst = await kaart.innerText();
  const totaalTekst = (kaartTekst.match(/Totaal[^\n]*\n?[^\n]*€\s*[\d.]+,\d{2}/) || [kaartTekst])[0];
  const getoond = bedrag((kaartTekst.match(/€\s*[\d.]+,\d{2}(?!.*€)/s) || ["0"])[0]);
  rapport("de rekentool toont een totaal", getoond > 0, `${getoond / 100} (${totaalTekst.replace(/\n/g, " ").slice(0, 60)})`);

  // aanvraag versturen
  await p.getByRole("button", { name: /Offerte aanvragen/ }).first().click();
  await p.getByLabel(/naam/i).first().fill("Rekenkern Test");
  await p.getByLabel(/e-?mail/i).first().fill("rekenkern@example.nl");
  await p.getByRole("button", { name: /Aanvraag versturen|Versturen|Verstuur/ }).last().click();
  await p.waitForTimeout(2500);
  const lead = sql(`select id, "totaalIndicatie", snapshot->'rekenkern'->>'bron', snapshot->'rekenkern'->>'configHash', (snapshot->'rekenkern'->'resultaat'->>'totaalInclCenten') from "Lead" where email = 'rekenkern@example.nl' order by "createdAt" desc limit 1`).split("|");
  rapport("de aanvraag staat in de database met een momentopname van de rekenkern", lead.length === 5 && lead[2] === "server", lead.join(" | "));
  rapport("totaal in de database = totaal dat de klant zag (op de cent)", Math.round(Number(lead[1]) * 100) === getoond && Number(lead[4]) === getoond, `${lead[1]} vs ${getoond / 100}`);
  const regelsDb = sql(`select count(*) from "Lead" l, jsonb_array_elements(l.snapshot->'rekenkern'->'resultaat'->'regels') where l.id = '${lead[0]}'`);
  rapport("de momentopname bevat de volledige opbouw (regels in centen)", Number(regelsDb) >= 6, `${regelsDb} regels`);

  // verknoeide aanvraag: de browser claimt een veel lager bedrag
  const snap = JSON.parse(sql(`select snapshot from "Lead" where id = '${lead[0]}'`));
  const echtCenten = snap.rekenkern.resultaat.totaalInclCenten;
  snap.totaal = 1; snap.subtotaal = 1; snap.rekenkern.resultaat.totaalInclCenten = 100; snap.rekenkern.bron = "client";
  const r = await p.request.post(`${BASE}/api/embed/lead`, { data: { toolId: TOOL, naam: "Knoeier", email: "knoeier@example.nl", snapshot: snap, sleutel: "knoeier-sleutel-0123456789" } });
  rapport("een aanvraag met een verknoeid bedrag wordt wel geaccepteerd", r.ok(), String(r.status()));
  const k = sql(`select "totaalIndicatie", snapshot->'rekenkern'->>'bron', snapshot->'rekenkern'->'afwijking'->>'klantCenten', snapshot->'rekenkern'->'afwijking'->>'serverCenten' from "Lead" where email = 'knoeier@example.nl' order by "createdAt" desc limit 1`).split("|");
  rapport("de server bewaart zijn eigen bedrag, niet dat van de browser", Math.round(Number(k[0]) * 100) === echtCenten && k[1] === "server", k.join(" | "));
  rapport("de afwijking staat in de momentopname", Number(k[2]) === 100 && Number(k[3]) === echtCenten, k.join(" | "));
  const log = fs.readFileSync("/tmp/mobile-app.log", "utf8");
  rapport("de afwijking is gelogd met details", /\[prijs\] servertotaal wijkt af van de browser/.test(log), "");

  // een aanvraag zonder invoer (oudere browser): niet nagerekend, wel opgeslagen
  const oud = JSON.parse(JSON.stringify(snap)); delete oud.rekenkern;
  const r2 = await p.request.post(`${BASE}/api/embed/lead`, { data: { toolId: TOOL, naam: "Oud", email: "oud@example.nl", snapshot: oud, sleutel: "oud-sleutel-0123456789ab" } });
  rapport("een aanvraag zonder invoer wordt opgeslagen (niet nagerekend)", r2.ok(), String(r2.status()));
  rapport("geen uncaught fouten in de browser", fouten.length === 0, fouten.join("; ").slice(0, 200));
  fs.writeFileSync(`${UIT}/aanvraag-resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} geslaagd`);
  console.log("LEAD", lead[0]);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 600)); process.exit(1); });
