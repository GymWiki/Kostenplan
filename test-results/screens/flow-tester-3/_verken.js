const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const page = await ctx.newPage();
  const fouten = [];
  page.on("console", (m) => { if (m.type() === "error") fouten.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => fouten.push("pageerror " + e.message.slice(0, 200)));
  await page.goto("http://localhost:3200/test-embed?tool=cmv6wdxux004qq47dowifa9j4&modus=script", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/home/user/Kostenplan/test-results/screens/flow-tester-3/01-verken-script.png" });
  const info = await page.evaluate(() => ({ host: document.querySelector('[data-testid="embed-host"]')?.innerHTML.slice(0, 600), body: document.body.innerText.slice(0, 1200), shadow: [...document.querySelectorAll("*")].filter(e => e.shadowRoot).map(e => e.tagName) }));
  console.log(JSON.stringify(info, null, 1));
  console.log("FOUTEN", fouten);
  await b.close();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
