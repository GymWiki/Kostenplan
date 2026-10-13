// Lighthouse (mobiel) tegen de testomgeving.
//   node scripts/test/lighthouse.mjs <url> [gebruiker]      → één pagina, JSON met scores en Core Web Vitals
//   node scripts/test/lighthouse.mjs --ci                    → landing, /probeer, embed en Overzicht tegen de drempels in lighthouse-budget.json (exitcode 1 bij overschrijding)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
const require = createRequire(import.meta.url);
const { cookie, GEBRUIKERS } = require("./ids.js");
const BASE = process.env.BASE || "http://localhost:3200";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const dir = path.dirname(new URL(import.meta.url).pathname);

async function meet(url, gebruiker) {
  const chrome = await chromeLauncher.launch({ chromePath: CHROMIUM, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
  try {
    const c = gebruiker ? cookie(GEBRUIKERS[gebruiker] || gebruiker, BASE) : null;
    const r = await lighthouse(url, {
      port: chrome.port, output: "json", logLevel: "error", formFactor: "mobile",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      screenEmulation: { mobile: true, width: 412, height: 915, deviceScaleFactor: 2.625, disabled: false },
      extraHeaders: c ? { Cookie: `${c.name}=${c.value}` } : undefined,
    });
    const l = r.lhr;
    const a = (k) => l.audits[k]?.numericValue;
    return {
      url, gebruiker: gebruiker || "anoniem",
      scores: Object.fromEntries(Object.entries(l.categories).map(([k, v]) => [k, Math.round(v.score * 100)])),
      metrics: { fcp_ms: Math.round(a("first-contentful-paint")), lcp_ms: Math.round(a("largest-contentful-paint")), tbt_ms: Math.round(a("total-blocking-time")), cls: Number((a("cumulative-layout-shift") ?? 0).toFixed(3)), speedIndex_ms: Math.round(a("speed-index")) },
      js_kb: Math.round((l.audits["total-byte-weight"]?.numericValue ?? 0) / 1024),
      slechtste: Object.values(l.audits).filter((x) => x.score !== null && x.score < 0.5 && x.details?.type !== "debugdata").slice(0, 6).map((x) => x.title),
    };
  } finally { await chrome.kill(); }
}

const arg = process.argv[2];
if (arg === "--ci") {
  const budget = JSON.parse(fs.readFileSync(path.join(dir, "lighthouse-budget.json"), "utf8"));
  const seed = JSON.parse(fs.readFileSync(path.join(dir, "../../test-results/seed.json"), "utf8"));
  const paginas = [["landing", `${BASE}/`, null], ["probeer", `${BASE}/probeer`, null], ["embed", `${BASE}/embed/${seed.a1.tools.tuinaanleg}`, null], ["overzicht", `${BASE}/dashboard`, "a1"]];
  let fout = 0;
  const uit = [];
  for (const [naam, url, g] of paginas) {
    const m = await meet(url, g);
    const b = budget[naam];
    const problemen = [];
    for (const [k, min] of Object.entries(b.scores)) if (m.scores[k] < min) problemen.push(`${k} ${m.scores[k]} < ${min}`);
    if (m.metrics.lcp_ms > b.lcp_ms) problemen.push(`LCP ${m.metrics.lcp_ms} ms > ${b.lcp_ms}`);
    if (m.metrics.cls > b.cls) problemen.push(`CLS ${m.metrics.cls} > ${b.cls}`);
    console.log(`${problemen.length ? "FAIL" : "PASS"}  ${naam}  ${JSON.stringify(m.scores)} LCP ${m.metrics.lcp_ms} ms CLS ${m.metrics.cls}${problemen.length ? "  → " + problemen.join("; ") : ""}`);
    if (problemen.length) fout++;
    uit.push({ naam, ...m, problemen });
  }
  fs.mkdirSync(path.join(dir, "../../test-results"), { recursive: true });
  fs.writeFileSync(path.join(dir, "../../test-results/lighthouse.json"), JSON.stringify(uit, null, 2));
  process.exit(fout ? 1 : 0);
} else if (arg) {
  console.log(JSON.stringify(await meet(arg.startsWith("http") ? arg : BASE + arg, process.argv[3]), null, 2));
} else {
  console.error("Gebruik: node scripts/test/lighthouse.mjs <url> [gebruiker] | --ci");
  process.exit(2);
}
