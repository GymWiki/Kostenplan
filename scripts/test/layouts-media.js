// Schermafbeeldingen (390 × 844 en 1440 × 900) en een korte GIF per weergave van de klant-rekentool.
//   BASE=http://localhost:3200 node scripts/test/layouts-media.js [uitmap]     (testomgeving, nooit productie)
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const BASE = process.env.BASE || "http://localhost:3200";
if (/kostenplan\.nl/.test(BASE)) throw new Error("Nooit op productie.");
const UIT = process.argv[2] || "docs/calculator-layouts";
const seed = JSON.parse(fs.readFileSync("test-results/seed.json", "utf8")).a1;
const sql = (q) => execFileSync("psql", [process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();
const { antwoord, TEGEL } = require("../mobile-ux/fake-pdok.js");
fs.mkdirSync(UIT, { recursive: true });
const TMP = "/tmp/layouts-video";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const SCHERMEN = { mobiel: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const pauze = (ms) => new Promise((r) => setTimeout(r, ms));

async function nieuweContext(browser, naam, scherm) {
  const ctx = await browser.newContext({
    viewport: scherm,
    deviceScaleFactor: 1,
    locale: "nl-NL",
    isMobile: naam === "mobiel",
    hasTouch: naam === "mobiel",
    recordVideo: { dir: TMP, size: scherm },
  });
  await ctx.route("https://api.pdok.nl/**", (route) => {
    const r = antwoord(route.request().url());
    return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) });
  });
  await ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  return ctx;
}

async function adres(f) {
  for (let i = 0; i < 8; i++) {
    if (await f.locator("[data-onderdeel], button[aria-expanded]:has-text('Schutting'), button[aria-pressed]:has-text('Schutting')").first().isVisible().catch(() => false)) return;
    await f.locator("#wg-adres").fill("8011AB 5").catch(() => {});
    await f.getByRole("option").first().click({ timeout: 3000 }).catch(() => {});
  }
}

async function film(ctx, page, naam) {
  const video = page.video();
  await ctx.close();
  const bron = await video.path();
  const gif = path.join(UIT, `${naam}.gif`);
  const breedte = naam.includes("mobiel") ? 390 : 800;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", bron, "-vf", `fps=8,scale=${breedte}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4`, gif]);
  console.log("GIF", gif, Math.round(fs.statSync(gif).size / 1024), "kB");
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const schutting = seed.products[1];
  for (const [scherm, maat] of Object.entries(SCHERMEN)) {
    for (const weergave of ["tegels", "stappen", "lijst"]) {
      sql(`UPDATE "Tool" SET "weergaveConfig" = '${JSON.stringify({ weergave })}'::jsonb WHERE id = '${seed.tools.tuinaanleg}'`);
      const ctx = await nieuweContext(browser, scherm, maat);
      const page = await ctx.newPage();
      const foto = async (stap) => { await pauze(400); await page.screenshot({ path: path.join(UIT, `${weergave}-${scherm}-${stap}.png`) }); };
      // De rekentool zoals een klant hem ziet, in een iframe op de pagina van de hovenier (netjes, zonder de testpagina-CSS).
      await page.goto(`${BASE}/test-embed?tool=${seed.tools.tuinaanleg}&modus=script&stijl=neutraal`);
      const f = page.frameLocator("iframe").first();
      await f.getByRole("heading", { name: "Stel je project samen" }).waitFor({ timeout: 30000 });
      await adres(f);
      await pauze(600);
      await foto("1-begin");
      if (weergave === "tegels") {
        await f.locator("button[aria-expanded]").filter({ hasText: /^Schutting/ }).click();
        await pauze(500);
        await foto("2-onderdeel");
        const p = scherm === "mobiel" ? f.getByRole("dialog") : f.locator("#tegel-paneel");
        await p.getByLabel(/Aantal Schutting/).fill("20");
        await p.getByRole("button", { name: /Douglas schutting/ }).click();
        await pauze(500);
        await p.getByRole("button", { name: "Toevoegen aan mijn tuinplan" }).click();
        await foto("3-toegevoegd");
        await f.getByRole("button", { name: "Bekijk en vraag aan" }).click();
        await pauze(500);
        await foto("4-overzicht");
      } else if (weergave === "stappen") {
        await f.locator("button[aria-pressed]").filter({ hasText: /^Schutting/ }).click();
        await foto("2-gekozen");
        await f.getByRole("button", { name: "Volgende" }).click();
        await f.getByLabel(/Aantal Schutting/).fill("20");
        await f.getByRole("button", { name: /Douglas schutting/ }).click();
        await foto("3-onderdeel");
        await f.getByRole("button", { name: /Bekijk overzicht/ }).click();
        await pauze(500);
        await foto("4-overzicht");
      } else {
        await f.getByLabel(/Aantal Schutting/).fill("20");
        await f.locator("select").first().selectOption({ index: 1 });
        await pauze(500);
        await foto("2-ingevuld");
      }
      await film(ctx, page, `${weergave}-${scherm}`);
    }
  }
  // Knop met pop-up.
  for (const [scherm, maat] of Object.entries(SCHERMEN)) {
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${seed.tools.tuinaanleg}'`);
    const ctx = await nieuweContext(browser, scherm, maat);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/test-embed?tool=${seed.tools.tuinaanleg}&modus=script&stijl=neutraal&weergave=tegels&plaatsing=popup&knop=${encodeURIComponent("Bereken je prijs")}&positie=rechtsonder`);
    await pauze(800);
    await page.screenshot({ path: path.join(UIT, `popup-${scherm}-1-knop.png`) });
    await page.getByRole("button", { name: "Bereken je prijs" }).click();
    const f = page.frameLocator("iframe").first();
    await f.getByRole("heading", { name: "Stel je project samen" }).waitFor({ timeout: 30000 });
    await adres(f);
    await pauze(800);
    await page.screenshot({ path: path.join(UIT, `popup-${scherm}-2-venster.png`) });
    await page.keyboard.press("Escape");
    await pauze(500);
    await film(ctx, page, `popup-${scherm}`);
  }
  sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${seed.tools.tuinaanleg}'`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
