const { chromium } = require("@playwright/test");
const { cookie, GEBRUIKERS } = require("/home/user/Kostenplan/scripts/test/ids.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json").a1;
const BASE = "http://localhost:3200";
const CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const schermen = [
  ["landing", "/"],
  ["probeer", "/probeer"],
  ["embed", `/embed/${seed.tools.tuinaanleg}`],
  ["dashboard", "/dashboard"],
  ["leads", "/dashboard/leads"],
  ["facturen", "/dashboard/facturen"],
  ["calculator", `/dashboard/tools/${seed.tools.tuinaanleg}/calculator`],
];
(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const uit = [];
  for (const [naam, pad] of schermen) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, locale: "nl-NL", timezoneId: "Europe/Amsterdam", deviceScaleFactor: 2.625 });
    if (!["landing", "probeer", "embed"].includes(naam) || naam === "embed") await ctx.addCookies([cookie(GEBRUIKERS.a1, BASE)]);
    const page = await ctx.newPage();
    const reqs = new Map();
    page.on("requestfinished", async (r) => {
      const res = await r.response();
      reqs.set(r.url() + r.method() + Math.random(), { type: r.resourceType(), size: res ? (await res.body().catch(() => Buffer.alloc(0))).length : 0 });
    });
    const t0 = Date.now();
    let fout = null;
    try { await page.goto(BASE + pad, { waitUntil: "networkidle", timeout: 60000 }); } catch (e) { fout = e.message.slice(0, 120); }
    const ms = Date.now() - t0;
    await new Promise((r) => setTimeout(r, 300));
    const lijst = [...reqs.values()];
    const js = lijst.filter((x) => x.type === "script");
    const jsKb = Math.round(js.reduce((a, x) => a + x.size, 0) / 1024);
    const totKb = Math.round(lijst.reduce((a, x) => a + x.size, 0) / 1024);
    const rij = { naam, pad, tot_netwerk_rustig_ms: ms, requests: lijst.length, js_requests: js.length, js_kb: jsKb, totaal_kb: totKb, fout, url_eind: page.url().replace(BASE, "") };
    console.log(JSON.stringify(rij));
    uit.push(rij);
    await ctx.close();
  }
  await browser.close();
  require("fs").writeFileSync("/home/user/Kostenplan/test-results/perf-tester-1-load.json", JSON.stringify(uit, null, 2));
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
