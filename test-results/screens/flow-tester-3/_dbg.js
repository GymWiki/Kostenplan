const { chromium } = require("@playwright/test");
const { pdokNepRoutes } = require("./_pdok.js");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  await pdokNepRoutes(ctx);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3200/test-embed?tool=cmv6wdxux004qq47dowifa9j4&modus=script`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log(page.frames().map(f => f.url()));
  console.log(await page.evaluate(() => [...document.querySelectorAll("iframe")].map(i => i.src + " | " + i.getBoundingClientRect().height)));
  const f = page.frames().find(f => f.url().includes("/embed/"));
  if (f) console.log("INPUTS", await f.evaluate(() => [...document.querySelectorAll("input,button")].map(e => e.tagName + " " + (e.placeholder||"") + " " + e.innerText.slice(0,40) + " " + (e.name||""))));
  await b.close();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
