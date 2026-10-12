// Controle: kopbalk (terug + titel) en bottom sheet in de editor op mobiel (gast-editor, /probeer).
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200";
const UIT = process.argv[2] || "docs/mobile-ux/editor-fix";
const res = [];
const rapport = (naam, ok, d) => { res.push({ naam, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${naam}  ${d || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(UIT, { recursive: true });

async function gastEditor(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const fouten = []; p.on("pageerror", (e) => fouten.push(e.message));
  await p.goto(BASE + "/probeer", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Volgende" }).tap(); await slaap(300);
  await p.getByRole("button", { name: "Volgende" }).tap(); await slaap(600);
  if (!/probeer\/editor/.test(p.url())) await p.locator("button[form=probeer-formulier]").tap();
  await p.waitForURL(/probeer\/editor/, { timeout: 25000 }); await slaap(2500);
  return { ctx, p, fouten };
}
const kopBodem = (p) => p.evaluate(() => document.querySelector("header").getBoundingClientRect().bottom);
const sheetBox = (p) => p.locator("[data-bottom-sheet]").boundingBox();

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  for (const [w, h] of [[390, 844], [360, 800]]) {
    const { ctx, p, fouten } = await gastEditor(b, w, h);
    const t = `${w}`;
    await p.getByRole("button", { name: "Prijzen aanpassen" }).tap(); await slaap(500);
    await p.getByRole("button", { name: /Checklist en onderdelen/ }).tap(); await slaap(700);
    await p.screenshot({ path: `${UIT}/${t}-sheet-start-hoog.png` });
    await p.getByRole("dialog").getByRole("button", { name: /Bestrating/ }).first().tap(); await slaap(900);
    await p.screenshot({ path: `${UIT}/${t}-sheet-werkzaamheid-hoog.png` });
    const kb = await kopBodem(p); const sb = await sheetBox(p);
    rapport(`${t}: sheet begint net onder de kopbalk`, Math.abs(sb.y - (kb + 8)) <= 2, `kopbalk onderkant ${Math.round(kb)}, sheet top ${Math.round(sb.y)}`);
    const kopKlikbaar = await p.evaluate(() => { const h = document.querySelector("header"); const r = h.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 40, r.top + r.height / 2); return h.contains(el); });
    rapport(`${t}: kopbalk ligt boven de sheet en is klikbaar`, kopKlikbaar, "");
    // één kop in de sheet
    const namen = await p.getByRole("dialog").locator("h1, h2, h3").evaluateAll((els) => els.filter((e) => /Bestrating/.test(e.textContent) && e.getBoundingClientRect().width > 1 && e.getBoundingClientRect().height > 1).length);
    const invoerNaam = await p.getByRole("dialog").locator("#wz-naam").inputValue();
    rapport(`${t}: naam staat één keer in de sheet`, namen === 0 && /Bestrating/.test(invoerNaam), `zichtbare koppen met de naam naast het naamveld: ${namen}`);
    // slepen naar half
    const handvat = p.locator("[data-bottom-sheet] div.touch-none").first();
    const hb = await handvat.boundingBox();
    const cdp = await ctx.newCDPSession(p);
    const sleepTouch = async (dy) => {
      const x = hb.x + hb.width / 2, y = hb.y + 8;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / 8 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await slaap(600);
    };
    await sleepTouch(260);
    const half = await sheetBox(p);
    rapport(`${t}: slepen naar halverwege laat de sheet op de helft staan`, half && half.height < sb.height * 0.65 && half.height > sb.height * 0.35, `hoogte ${Math.round(sb.height)} → ${half && Math.round(half.height)}`);
    await p.screenshot({ path: `${UIT}/${t}-sheet-half.png` });
    // verder omlaag sluit
    const hb2 = await p.locator("[data-bottom-sheet] div.touch-none").first().boundingBox();
    const x = hb2.x + hb2.width / 2, y = hb2.y + 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + 20 * i }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await slaap(600);
    rapport(`${t}: verder omlaag slepen sluit de sheet`, (await p.locator("[data-bottom-sheet]").count()) === 0, "");
    // heropenen en toetsenbord
    await p.getByRole("button", { name: "Checklist en onderdelen" }).tap(); await slaap(500);
    await slaap(600);
    const prijs = p.getByRole("dialog").getByLabel(/Jouw prijs/).first();
    await prijs.scrollIntoViewIfNeeded(); await prijs.tap();
    await p.setViewportSize({ width: w, height: Math.round(h * 0.52) }); await slaap(900);
    const kb2 = await kopBodem(p); const sb2 = await sheetBox(p);
    const veldBox = await prijs.boundingBox();
    const vh = await p.evaluate(() => window.visualViewport.height);
    rapport(`${t}: toetsenbord open: sheet blijft onder de kopbalk`, Math.abs(sb2.y - (kb2 + 8)) <= 2 && sb2.y + sb2.height <= vh + 1, `sheet ${Math.round(sb2.y)}–${Math.round(sb2.y + sb2.height)}, zichtbaar tot ${Math.round(vh)}`);
    rapport(`${t}: toetsenbord open: actief veld in beeld`, veldBox.y >= sb2.y && veldBox.y + veldBox.height <= vh + 1, `veld ${Math.round(veldBox.y)}–${Math.round(veldBox.y + veldBox.height)}`);
    await p.screenshot({ path: `${UIT}/${t}-toetsenbord.png` });
    await p.setViewportSize({ width: w, height: h }); await slaap(600);
    // lang drukken op de titel: geen selectie, geen contextmenu
    const titel = p.locator("header a").first();
    const tb = await titel.boundingBox();
    await p.evaluate(() => { window.__cm = 0; document.addEventListener("contextmenu", () => window.__cm++); });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tb.x + 60, y: tb.y + tb.height / 2 }] });
    await slaap(900);
    const sel = await p.evaluate(() => (window.getSelection() || "").toString());
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const stijl = await p.evaluate(() => { const h = getComputedStyle(document.querySelector("header")); return h.userSelect + "|" + h.getPropertyValue("-webkit-touch-callout") + "|" + h.touchAction; });
    rapport(`${t}: lang drukken op de titel selecteert niets`, sel === "", `selectie: "${sel}", stijl: ${stijl}`);
    // tikken op de titel gaat terug (ook met open sheet)
    await slaap(400);
    const open = (await p.locator("[data-bottom-sheet]").count()) > 0;
    await titel.tap(); await p.waitForURL((u) => u.pathname === "/", { timeout: 8000 }).catch(() => {});
    rapport(`${t}: tikken op de titel gaat terug (sheet open: ${open})`, new URL(p.url()).pathname === "/", p.url());
    rapport(`${t}: geen uncaught fouten`, fouten.length === 0, fouten.join("; ").slice(0, 200));
    await ctx.close();
  }
  // lange titel: één regel met ellips, status en ⋯ blijven zichtbaar
  {
    const { ctx, p } = await gastEditor(b, 360, 800);
    await p.getByRole("button", { name: "Meer acties voor deze rekentool" }).tap(); await slaap(300);
    await p.getByRole("menuitem", { name: /Naam wijzigen/ }).tap().catch(async () => { await p.getByText("Naam wijzigen").tap(); });
    await p.getByLabel("Naam van je rekentool").fill("Schilderwerk binnen en buiten voor particulieren en bedrijven in de regio");
    await p.getByRole("button", { name: "Opslaan" }).tap(); await slaap(700);
    const m = await p.evaluate(() => { const l = document.querySelector("header a span.truncate"); const st = document.querySelector("header [aria-live]"); const menu = document.querySelector('header button[aria-label^="Meer acties"]'); const hb = document.querySelector("header").getBoundingClientRect(); const r = (e) => e.getBoundingClientRect(); return { afgekapt: l.scrollWidth > l.clientWidth, regels: Math.round(r(l).height / parseFloat(getComputedStyle(l).lineHeight)), statusIn: r(st).right <= hb.right && r(st).width > 0, menuIn: r(menu).right <= hb.right + 1 }; });
    rapport("360: lange titel: één regel met ellips, status en ⋯ zichtbaar", m.afgekapt && m.regels === 1 && m.statusIn && m.menuIn, JSON.stringify(m));
    await p.screenshot({ path: `${UIT}/360-lange-titel.png` });
    await ctx.close();
  }
  fs.writeFileSync(`${UIT}/resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 400)); fs.writeFileSync(`${UIT}/resultaten.json`, JSON.stringify(res, null, 2)); process.exit(1); });
