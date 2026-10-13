const fs = require("fs");
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
const menu = (s) => s.page.evaluate(() => [...document.querySelectorAll("[role=menuitem],[role=option],[role=menu] *,[role=listbox] *,[role=dialog] button,[role=dialog] a")].map((e) => (e.innerText || "").trim().replace(/\s+/g, " ")).filter((x) => x && x.length < 80).join(" | "));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 150 });
  await s.page.getByRole("button", { name: /Hoveniersbedrijf De Vries/ }).first().click({ timeout: 5000 }).catch((e) => console.log("wissel-knop fout", e.message.split("\n")[0]));
  await s.page.waitForTimeout(500);
  console.log("MENU: " + await menu(s));
  await s.page.getByText("Groenstijl Tuinen", { exact: true }).first().click({ timeout: 5000 }).catch((e) => console.log("kies fout", e.message.split("\n")[0]));
  await s.page.waitForLoadState("networkidle").catch(() => {});
  await s.page.waitForTimeout(800);
  console.log("URL", s.page.url());
  const lijst = await s.page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, "\n").slice(0, 600));
  console.log("KOP:\n" + lijst);
  await s.page.goto(k.BASE + "/dashboard/leads?weergave=lijst", { waitUntil: "networkidle" });
  await s.page.getByText("Gina Groen").first().click({ timeout: 5000 }).catch((e) => console.log("gina fout", e.message.split("\n")[0]));
  await s.page.waitForTimeout(800);
  const pdfLink = await s.page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => /pdf/i.test(a.getAttribute("href") || "")).map((a) => a.getAttribute("href")));
  console.log("PDF-links:", JSON.stringify(pdfLink));
  const href = pdfLink.find((h) => h && !/getekend/.test(h)) || pdfLink[0];
  if (href) { const r = await s.ctx.request.get(new URL(href, k.BASE).toString()); fs.writeFileSync(DIR + "document-checker-1-groenstijl-gina.pdf", await r.body()); console.log("PDF status", r.status(), r.headers()["content-type"]); }
  await s.page.screenshot({ path: DIR + "ui-groenstijl-gina.png" });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
