// Controle: geen "werkzaamheid(en)", "Op je website" of zichtbaar "Zichtbaar voor klanten" in
// gerenderde pagina's (ingelogd en gast, 360/390 px en 1440 px). Maakt ook schermafbeeldingen van
// de onderdelenlijst met één zichtbaar en één verborgen onderdeel.
//   TOOL=<id> node scripts/mobile-ux/copy-controle.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200", TOOL = process.env.TOOL, UIT = process.argv[2] || "docs/mobile-ux/onderdeel-copy";
fs.mkdirSync(UIT, { recursive: true });
const res = [];
const rapport = (n, ok, d) => { res.push({ n, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); };
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
const TEKST = `(() => { const zicht = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const t = [document.body.innerText]; document.querySelectorAll("[aria-label],[title],[placeholder]").forEach((e) => { if (zicht(e)) t.push(e.getAttribute("aria-label") || "", e.getAttribute("title") || "", e.getAttribute("placeholder") || ""); }); return t.join("\\n"); })()`;
const VERBODEN = [/werkzaamhe/i, /Op je website/, /Zichtbaar voor klanten(?!:)/];
async function controleer(p, naam) {
  const t = await p.evaluate(TEKST);
  const hits = VERBODEN.flatMap((re) => (t.match(new RegExp(re.source, re.flags + "g")) || []).map((m) => m));
  rapport(`${naam}: geen verboden woorden in zichtbare tekst/labels`, hits.length === 0, hits.slice(0, 5).join(" | "));
}
async function gastStart(b, vp, mobiel) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobiel, hasTouch: mobiel });
  const p = await ctx.newPage();
  await p.goto(BASE + "/probeer", { waitUntil: "networkidle" });
  for (let i = 0; i < 2; i++) { const v = p.getByRole("button", { name: "Volgende" }); if (await v.count()) { await v.click(); await slaap(400); } }
  if (!/probeer\/editor/.test(p.url())) await p.locator("button[form=probeer-formulier], button[type=submit]").first().click();
  await p.waitForURL(/probeer\/editor/, { timeout: 25000 }); await slaap(2500);
  return { ctx, p };
}
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  for (const modus of ["ingelogd", "gast"]) {
    for (const [w, h, mobiel] of [[390, 844, true], [360, 800, true], [1440, 900, false]]) {
      const t = `${modus} ${w}`;
      let ctx, p;
      if (modus === "gast") ({ ctx, p } = await gastStart(b, { width: w, height: h }, mobiel));
      else {
        ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobiel, hasTouch: mobiel });
        await ctx.addCookies([require("./cookie.js")()]);
        p = await ctx.newPage(); await p.goto(`${BASE}/dashboard/tools/${TOOL}`, { waitUntil: "networkidle" }); await slaap(2500);
      }
      if (mobiel) {
        if (modus === "gast") await p.getByText("Bewerken", { exact: true }).first().click().catch(() => {});
        await slaap(600);
        await controleer(p, `${t} lijst`);
        // knop onderin past: geen horizontale overloop, label zichtbaar
        const balk = await p.evaluate(`(() => { const b = document.querySelector("[data-actiebalk]"); if (!b) return null; const bt = [...b.querySelectorAll("button")].map((x) => { const r = x.getBoundingClientRect(); return { tekst: x.innerText.trim(), l: Math.round(r.left), r: Math.round(r.right), afgekapt: [...x.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth) }; }); return { bt, breedte: innerWidth }; })()`);
        if (balk) rapport(`${t}: onderbalk bevat alleen "+ Onderdeel"`, balk.bt.length === 1 && /Onderdeel/.test(balk.bt[0].tekst) && balk.bt[0].r <= balk.breedte, JSON.stringify(balk.bt));
        // één onderdeel verbergen
        const eerste = p.getByLabel(/^Zichtbaar voor klanten: /).first();
        await eerste.scrollIntoViewIfNeeded().catch(() => {});
        await p.locator("label", { hasText: "Zichtbaar" }).first().click(); await slaap(1200);
        await controleer(p, `${t} lijst met verborgen onderdeel`);
        const verborgen = await p.getByText("Verborgen voor klanten", { exact: true }).count();
        rapport(`${t}: verborgen onderdeel heeft label "Verborgen voor klanten"`, verborgen >= 1, String(verborgen));
        await p.screenshot({ path: `${UIT}/${modus}-${w}-lijst.png` });
        await p.getByRole("button", { name: /Onderdeel$|^Onderdeel/ }).first().click().catch(() => {}); await slaap(500);
        await controleer(p, `${t} toevoegen`);
        await p.keyboard.press("Escape"); await slaap(400);
        await p.getByRole("button", { name: /Bestrating|Kunstgras|Schutting/ }).first().click(); await slaap(1000);
        await controleer(p, `${t} onderdeel-sheet`);
      } else {
        if (modus === "gast") await p.getByRole("button", { name: "Prijzen aanpassen" }).click().catch(() => {});
        await slaap(800);
        await controleer(p, `${t} start`);
        const sw = p.getByLabel(/^Zichtbaar voor klanten: /).first();
        await sw.check({ force: true }).catch(() => {}); await sw.uncheck({ force: true }).catch(() => {}); await slaap(1200);
        const verborgen = await p.getByText("Verborgen voor klanten", { exact: true }).count();
        rapport(`${t}: verborgen onderdeel heeft label "Verborgen voor klanten"`, verborgen >= 1, String(verborgen));
        await p.screenshot({ path: `${UIT}/${modus}-${w}-lijst.png` });
        await p.getByRole("button", { name: /Bestrating|Kunstgras|Schutting|Graszoden/ }).first().click().catch(() => {}); await slaap(900);
        await controleer(p, `${t} onderdeel-paneel`);
      }
      if (modus === "ingelogd") { await p.goto(BASE + "/dashboard/tools", { waitUntil: "networkidle" }); await slaap(800); await controleer(p, `${t} rekentools-overzicht`); }
      await ctx.close();
    }
  }
  fs.writeFileSync(`${UIT}/resultaten.json`, JSON.stringify(res, null, 2));
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} geslaagd`);
  await b.close();
})().catch((e) => { console.error("HARNAS-FOUT", e.message.slice(0, 500)); process.exit(1); });
