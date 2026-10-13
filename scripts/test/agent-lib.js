// Hulpbibliotheek voor de testagents: een echte browser (Playwright/Chromium) met een ingelogde testgebruiker, console-/netwerkfouten
// verzameld, schermafbeeldingen en bevindingen in het vaste meldformaat. Agents schrijven hun eigen korte scripts met deze functies:
//
//   const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
//   const s = await k.open({ agent: "flow-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard" });
//   await s.page.getByRole("link", { name: "Leads" }).click();
//   await s.vondst({ area: "ux", title: "…", steps: ["…"], expected: "…", actual: "…", confidence: 0.8 });   // maakt zelf het scherm + console-fouten erbij
//   await s.sluit();
//
// Bevindingen komen in test-results/findings-raw/<agent>.jsonl, schermafbeeldingen in test-results/screens/<agent>/.
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { cookie, GEBRUIKERS } = require("./ids.js");

const ROOT = path.resolve(__dirname, "../..");
const BASE = process.env.BASE || "http://localhost:3200";
const VIEWPORTS = { mobiel: { width: 412, height: 915 }, "360": { width: 360, height: 780 }, "768": { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } };
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const seed = () => JSON.parse(fs.readFileSync(path.join(ROOT, "test-results/seed.json"), "utf8"));

async function open({ agent, gebruiker = null, viewport = "desktop", pad = "/", netwerk = null, maxStappen = 200 } = {}) {
  if (!agent) throw new Error("agent (naam) is verplicht");
  const vp = VIEWPORTS[viewport] || viewport;
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 600, isMobile: vp.width < 600, locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
  if (gebruiker) await ctx.addCookies([cookie(GEBRUIKERS[gebruiker] || gebruiker, BASE)]);
  const page = await ctx.newPage();
  const consoleFouten = [];
  const netwerkFouten = [];
  page.on("console", (m) => { if (m.type() === "error") consoleFouten.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => consoleFouten.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on("response", (r) => { if (r.status() >= 500) netwerkFouten.push(`${r.status()} ${r.url().slice(0, 150)}`); });
  if (netwerk === "slow3g") {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  }
  const dirScreens = path.join(ROOT, "test-results/screens", agent);
  const dirRaw = path.join(ROOT, "test-results/findings-raw");
  fs.mkdirSync(dirScreens, { recursive: true });
  fs.mkdirSync(dirRaw, { recursive: true });
  let n = 0;
  let stappen = 0;
  const s = {
    browser, ctx, page, consoleFouten, netwerkFouten, base: BASE, seed: seed(),
    // Telt acties; stopt het script als het stappenbudget op is.
    stap() { if (++stappen > maxStappen) throw new Error(`stappenbudget (${maxStappen}) op`); },
    async goto(p) { s.stap(); return page.goto(p.startsWith("http") ? p : BASE + p, { waitUntil: "networkidle", timeout: 30000 }); },
    async scherm(naam = "scherm") {
      const bestand = path.join(dirScreens, `${String(++n).padStart(2, "0")}-${naam.replace(/[^a-z0-9-]+/gi, "-").slice(0, 50)}.png`);
      await page.screenshot({ path: bestand, fullPage: false });
      return path.relative(ROOT, bestand);
    },
    // Een bevinding in het vaste formaat. Alleen melden wat je zelf hebt gezien.
    async vondst(v) {
      for (const k of ["area", "title", "steps", "expected", "actual"]) if (!v[k]) throw new Error(`vondst mist ${k}`);
      const rec = {
        id: `${agent}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        agent, area: v.area, title: v.title, url: page.url(), viewport: `${vp.width}x${vp.height}`, user: gebruiker || "anoniem",
        steps: v.steps, expected: v.expected, actual: v.actual, screenshot: v.screenshot || (await s.scherm(`vondst-${v.title}`)),
        console_errors: v.console_errors || consoleFouten.slice(-5), confidence: v.confidence ?? 0.7,
      };
      fs.appendFileSync(path.join(dirRaw, `${agent}.jsonl`), JSON.stringify(rec) + "\n");
      console.log(`VONDST ${rec.id}: ${rec.title}`);
      return rec;
    },
    async sluit() { await browser.close(); },
  };
  if (pad) await s.goto(pad);
  return s;
}

// axe-core op de huidige pagina; geeft serious/critical terug (en de rest apart).
async function axe(page, opties = {}) {
  await page.evaluate(require("axe-core").source);
  const r = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  const kort = (v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, voorbeeld: v.nodes[0]?.html?.slice(0, 160), doel: v.nodes[0]?.target?.join(" ") });
  return { ernstig: r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map(kort), overig: r.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical").map(kort) };
}

module.exports = { open, axe, BASE, VIEWPORTS, GEBRUIKERS, seed, ROOT };
if (require.main === module) {
  const s = seed();
  console.log(JSON.stringify({ base: BASE, gebruikers: GEBRUIKERS, a1: s.a1, b: s.b }, null, 2));
}
