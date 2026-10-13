const fs = require("fs");
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 150 });
  await s.page.locator("button").filter({ has: s.page.locator("span", { hasText: "Hoveniersbedrijf De Vries" }) }).first().click({ timeout: 5000 });
  await s.page.waitForTimeout(700);
  const g = s.page.getByText("Groenstijl Tuinen", { exact: false });
  console.log("groenstijl zichtbaar-aantal", await g.count());
  if (await g.count()) {
    await g.first().click({ timeout: 5000 }).catch((e) => console.log("klik", e.message.split("\n")[0]));
    await s.page.waitForLoadState("networkidle").catch(() => {});
    await s.page.waitForTimeout(800);
  }
  console.log("URL", s.page.url());
  await s.page.goto(k.BASE + "/dashboard/leads?weergave=lijst", { waitUntil: "networkidle" });
  await s.page.waitForTimeout(500);
  await s.page.getByText("Gina Groen").first().click({ timeout: 5000 }).catch((e) => console.log("gina fout", e.message.split("\n")[0]));
  await s.page.waitForTimeout(800);
  const pdfLink = await s.page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => /pdf/i.test(a.getAttribute("href") || "")).map((a) => a.getAttribute("href")));
  console.log("PDF-links:", JSON.stringify(pdfLink));
  const txt = await s.page.evaluate(() => (document.querySelector("[role=dialog]") || document.body).innerText.replace(/\n{2,}/g, "\n").slice(0, 900));
  console.log(txt);
  if (pdfLink.length) { const r = await s.ctx.request.get(new URL(pdfLink[0], k.BASE).toString()); fs.writeFileSync(DIR + "document-checker-1-groenstijl-gina.pdf", await r.body()); console.log("PDF status", r.status(), r.headers()["content-type"]); }
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
