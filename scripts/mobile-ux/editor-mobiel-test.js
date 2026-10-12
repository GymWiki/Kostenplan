// Test: mobiele editor-kopbalk en werkzaamheid-sheet, in BEIDE modi.
//   node scripts/mobile-ux/editor-mobiel-test.js <uitmap>        (gast + ingelogd)
// Vereist: lokale app op BASE (standaard http://localhost:3200) met nep-Supabase en TOOL=<rekentool-id>
// van de testgebruiker (zie cookie.js). Apparaat: Pixel 7 (412×915, touch, mobiel).
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200";
const TOOL = process.env.TOOL;
const UIT = process.argv[2] || "docs/mobile-ux/editor-eenduidig";
const MODI = (process.env.MODI || "gast,ingelogd").split(",");
const res = [];
const rapport = (naam, ok, d) => { res.push({ naam, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${naam}  ${d || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(UIT, { recursive: true });
const PIXEL7 = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" };

async function start(b, modus) {
  const ctx = await b.newContext(PIXEL7);
  if (modus === "ingelogd") await ctx.addCookies([require("./cookie.js")()]);
  const p = await ctx.newPage();
  const fouten = []; p.on("pageerror", (e) => fouten.push(e.message));
  if (modus === "gast") {
    await p.goto(BASE + "/probeer", { waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Volgende" }).tap(); await slaap(300);
    await p.getByRole("button", { name: "Volgende" }).tap(); await slaap(600);
    if (!/probeer\/editor/.test(p.url())) await p.locator("button[form=probeer-formulier]").tap();
    await p.waitForURL(/probeer\/editor/, { timeout: 25000 });
  } else {
    await p.goto(`${BASE}/dashboard/tools/${TOOL}`, { waitUntil: "networkidle" });
  }
  await slaap(2500);
  return { ctx, p, fouten };
}

// Eerste zichtbare editor-kopbalk (mobiel).
const KOP = `(() => [...document.querySelectorAll("header")].find((h) => { const r = h.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(h).display !== "none" && !h.closest("[data-desktop-only]"); }))()`;

async function openWerkzaamheid(p, modus) {
  if (modus === "gast") await p.getByRole("radio", { name: "Bewerken" }).tap().catch(async () => { await p.getByText("Bewerken", { exact: true }).first().tap(); });
  await slaap(600);
  await p.getByRole("button", { name: /Bestrating/ }).first().tap();
  await slaap(1200);
}

const SHEET = "[role=dialog]";
const sheetBox = (p) => p.locator(SHEET).last().boundingBox();
async function sleep(ctx, p, x, y, dy) {
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / 8 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await slaap(700);
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  for (const modus of MODI) {
    const t = modus;
    const { ctx, p, fouten } = await start(b, modus);
    await p.screenshot({ path: `${UIT}/${t}-0-start.png` });
    // a) tikdoel van de titel
    const a = await p.evaluate(`(() => { const h = ${KOP}; if (!h) return { fout: "geen kopbalk" }; const s = h.querySelector("span.truncate, h1"); const r = s.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const k = el && el.closest("a, button"); return { titel: s.textContent, binnenKnop: !!k && h.contains(k), tag: k && k.tagName }; })()`);
    rapport(`${t}: a) midden van de titel ligt in <a>/<button>`, !!a.binnenKnop, JSON.stringify(a));
    // c) user-select
    const c = await p.evaluate(`(() => { const h = ${KOP}; const s = h.querySelector("span.truncate, h1"); return getComputedStyle(s).userSelect + "|" + getComputedStyle(h).userSelect; })()`);
    rapport(`${t}: c) user-select van de titel is none`, c.startsWith("none"), c);
    // werkzaamheid openen
    await openWerkzaamheid(p, modus);
    await p.screenshot({ path: `${UIT}/${t}-1-werkzaamheid.png` });
    // d) sheet-top
    const d = await p.evaluate(`(() => { const h = ${KOP}; const hb = h.getBoundingClientRect().bottom; const sh = document.querySelector("[role=dialog]"); if (!sh) return { hb, geenSheet: true }; return { hb, top: sh.getBoundingClientRect().top }; })()`);
    rapport(`${t}: d) sheet-top tussen kopbalk-onderkant en +16 px`, d.top != null && d.top >= d.hb - 1 && d.top <= d.hb + 16, JSON.stringify(d));
    // e) terugknop klikbaar met open werkzaamheid
    const e = await p.evaluate(`(() => { const h = ${KOP}; const k = h.querySelector("a, button"); const r = k.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 20, r.top + r.height / 2); return { ok: k === el || k.contains(el), el: el && (el.tagName + ":" + (el.getAttribute("aria-label") || el.textContent || "").slice(0, 20)) }; })()`);
    rapport(`${t}: e) terugknop is bovenste element terwijl werkzaamheid open is`, e.ok, JSON.stringify(e));
    // f) geen "Terug naar overzicht"; naam precies één keer
    const f = await p.evaluate(`(() => { const zicht = (x) => { const r = x.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(x).visibility !== "hidden"; }; const scope = document.querySelector("[role=dialog], [data-bottom-sheet]") || document.body; const tekst = [...scope.querySelectorAll("*")].filter((x) => x.children.length === 0 && zicht(x)); const terug = tekst.filter((x) => /Terug naar overzicht/.test(x.textContent)).length; const naam = ((scope.querySelector("h2") || {}).textContent || "").trim(); const dezelfde = tekst.filter((x) => naam && x.textContent.trim() === naam.trim()).length; const invoer = [...scope.querySelectorAll("input")].filter((x) => zicht(x) && x.value === naam).length; return { terug, naam, kopTekst: dezelfde, invoer }; })()`);
    rapport(`${t}: f) "Terug naar overzicht" ontbreekt`, f.terug === 0, JSON.stringify(f));
    rapport(`${t}: f) naam precies één keer zichtbaar (invoer + losse tekst)`, f.invoer + f.kopTekst === 1, JSON.stringify(f));
    // sheet: slepen naar halverwege, verder omlaag sluit; toetsenbord; lange druk
    const kopBodem = () => p.evaluate(`(() => ${KOP}.getBoundingClientRect().bottom)()`);
    const hoog = await sheetBox(p);
    await sleep(ctx, p, hoog.x + hoog.width / 2, hoog.y + 10, 260);
    const half = await sheetBox(p);
    rapport(`${t}: sheet half na slepen (rekentool zichtbaar erachter)`, half && half.height < hoog.height * 0.75 && half.height > hoog.height * 0.4, `${Math.round(hoog.height)} → ${half && Math.round(half.height)}`);
    await p.screenshot({ path: `${UIT}/${t}-2-sheet-half.png` });
    await sleep(ctx, p, half.x + half.width / 2, half.y + 10, 160);
    rapport(`${t}: verder omlaag slepen sluit de sheet`, (await p.locator(SHEET).count()) === 0, "");
    await p.getByRole("button", { name: /Bestrating/ }).first().tap(); await slaap(1000);
    const veld = p.locator(SHEET).last().getByRole("button", { name: /Materialen en prijzen/ });
    await veld.tap(); await slaap(500);
    const prijs = p.locator(SHEET).last().getByLabel(/Jouw prijs/).first();
    await prijs.scrollIntoViewIfNeeded(); await prijs.tap();
    await p.setViewportSize({ width: 412, height: 520 }); await slaap(900);
    const sb2 = await sheetBox(p); const kb2 = await kopBodem(); const vb = await prijs.boundingBox(); const vh = await p.evaluate("window.visualViewport.height");
    rapport(`${t}: toetsenbord: sheet blijft onder de kopbalk`, Math.abs(sb2.y - (kb2 + 8)) <= 2 && sb2.y + sb2.height <= vh + 1, `sheet ${Math.round(sb2.y)}–${Math.round(sb2.y + sb2.height)}, kop ${Math.round(kb2)}, zichtbaar ${Math.round(vh)}`);
    rapport(`${t}: toetsenbord: actief veld in beeld`, vb.y >= sb2.y && vb.y + vb.height <= vh + 1, `veld ${Math.round(vb.y)}–${Math.round(vb.y + vb.height)}`);
    await p.screenshot({ path: `${UIT}/${t}-3-toetsenbord.png` });
    await p.setViewportSize({ width: 412, height: 915 }); await slaap(700);
    const cdp = await ctx.newCDPSession(p);
    await p.screenshot({ path: `${UIT}/${t}-4-na-toetsenbord.png` });
    const tb0 = await p.evaluate(`(() => { const r = ${KOP}.querySelector("span.truncate, h1").getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; })()`);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tb0.x, y: tb0.y }] }); await slaap(900);
    const sel = await p.evaluate("(window.getSelection() || '').toString()");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    rapport(`${t}: lang drukken op de titel selecteert niets`, sel === "", `selectie: "${sel}"`);
    await slaap(500);
    // b) tik op de titel navigeert naar Rekentools (gast: homepage), met open werkzaamheid, op een verse pagina
    await ctx.close();
    const v = await start(b, modus);
    await openWerkzaamheid(v.p, modus);
    const doel = modus === "gast" ? (u) => u.pathname === "/" : (u) => u.pathname === "/dashboard/tools";
    const tb = await v.p.evaluate(`(() => { const r = ${KOP}.querySelector("span.truncate, h1").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await v.p.touchscreen.tap(tb.x, tb.y);
    await v.p.waitForURL(doel, { timeout: 8000 }).catch(() => {});
    rapport(`${t}: b) tik op de titel navigeert naar Rekentools`, doel(new URL(v.p.url())), v.p.url());
    fouten.push(...v.fouten);
    rapport(`${t}: geen uncaught fouten`, fouten.length === 0, fouten.join("; ").slice(0, 200));
    await v.ctx.close();
  }
  fs.writeFileSync(`${UIT}/resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 600)); process.exit(1); });
