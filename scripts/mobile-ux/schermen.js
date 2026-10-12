// Schermafbeeldingen + meetwaarden per scherm. Gebruik: node schermen.js <label> <map> [breedtexhoogte,...]
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path");
const cookie = require("./cookie.js")();
const [label = "na", uit = "docs/mobile-ux", viewports = "390x844,360x800,1440x900"] = process.argv.slice(2);
const TOOL = process.env.TOOL, PROD = process.env.PROD, LEAD = process.env.LEAD, BASE = process.env.BASE || "http://localhost:3200";

const SCHERMEN = [
  ["overzicht", "/dashboard"],
  ["rekentools", "/dashboard/tools"],
  ["editor", `/dashboard/tools/${TOOL}`],
  ["werkzaamheid", `/dashboard/tools/${TOOL}?paneel=werkzaamheid:${PROD}`],
  ["leads", "/dashboard/leads"],
  ["lead-detail", "/dashboard/leads", async (p) => { await p.getByText("Piet Jansen").locator("visible=true").first().click(); await p.waitForTimeout(800); }],
  ["offerte", `/dashboard/leads/${LEAD}/offerte`],
  ["profiel", "/dashboard/profiel"],
  ["probeer", "/probeer"],
];

const meet = () => {
  const zicht = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const alle = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], summary")].filter(zicht);
  const vh = window.innerHeight;
  const bovenVouw = alle.filter((e) => { const r = e.getBoundingClientRect(); return r.top < vh && r.bottom > 0; });
  const klein = alle.filter((e) => { const r = e.getBoundingClientRect(); return (r.width < 44 || r.height < 44) && e.tagName !== "INPUT" || (e.tagName === "INPUT" && r.height < 44 && !["checkbox", "radio"].includes(e.type)); });
  const velden = bovenVouw.filter((e) => ["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName));
  const afgekapt = [...document.querySelectorAll("body *")].filter((e) => { if (!zicht(e) || !e.children.length === 0) return false; const s = getComputedStyle(e); return (s.textOverflow === "ellipsis" || s.overflow === "hidden") && e.scrollWidth > e.clientWidth + 1 && e.textContent.trim().length > 0 && e.children.length === 0; });
  return {
    interactiefBovenVouw: bovenVouw.length, invoervelden: velden.length, kleineTikdoelen: klein.length,
    kleineVoorbeelden: klein.slice(0, 6).map((e) => `${e.tagName.toLowerCase()}:${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24)}(${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)})`),
    horizontaalScrollen: document.documentElement.scrollWidth > window.innerWidth + 1, afgekapteTeksten: afgekapt.length,
    afgekaptVoorbeelden: afgekapt.slice(0, 4).map((e) => e.textContent.trim().slice(0, 30)),
  };
};

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const resultaat = {};
  for (const vp of viewports.split(",")) {
    const [w, h] = vp.split("x").map(Number);
    const mobiel = w < 768;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobiel ? 2 : 1, isMobile: mobiel, hasTouch: mobiel });
    await ctx.addCookies([cookie]);
    for (const [naam, url, actie] of SCHERMEN) {
      const p = await ctx.newPage();
      try {
        await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 60000 });
        await p.waitForTimeout(600);
        if (actie) await actie(p);
        const dir = path.join(uit, label, String(w)); fs.mkdirSync(dir, { recursive: true });
        await p.screenshot({ path: path.join(dir, `${naam}.png`) });
        await p.screenshot({ path: path.join(dir, `${naam}-vol.png`), fullPage: true });
        resultaat[`${w}/${naam}`] = await p.evaluate(meet);
      } catch (e) { resultaat[`${w}/${naam}`] = { fout: String(e.message).slice(0, 120) }; }
      await p.close();
    }
    await ctx.close();
  }
  fs.mkdirSync(path.join(uit, label), { recursive: true });
  fs.writeFileSync(path.join(uit, label, "meting.json"), JSON.stringify(resultaat, null, 2));
  for (const [k, v] of Object.entries(resultaat)) console.log(k.padEnd(24), v.fout ? "FOUT " + v.fout : `boven vouw ${v.interactiefBovenVouw}, velden ${v.invoervelden}, <44px ${v.kleineTikdoelen}, hscroll ${v.horizontaalScrollen}, afgekapt ${v.afgekapteTeksten}`);
  await b.close();
})();
