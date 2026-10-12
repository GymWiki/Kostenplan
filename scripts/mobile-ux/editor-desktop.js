// Desktop (1440 px): gast-editor met en zonder paneel, voor pixelvergelijking tussen twee builds.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const [poort, uit] = [process.argv[2], process.argv[3]];
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${poort}/probeer`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Maak mijn rekentool" }).first().click();
  await p.waitForURL(/probeer\/editor/, { timeout: 25000 }); await p.waitForTimeout(3000);
  fs.mkdirSync(uit, { recursive: true });
  await p.screenshot({ path: `${uit}/gast-editor.png` });
  await p.getByRole("button", { name: "Prijzen aanpassen" }).first().click(); await p.waitForTimeout(800);
  await p.locator("aside").getByRole("button", { name: /Bestrating/ }).first().click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${uit}/gast-editor-werkzaamheid.png` });
  await b.close();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
