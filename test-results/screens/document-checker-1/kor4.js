const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  // actieve bedrijf wisselen naar Groenstijl (zelfde als vorige stap)
  await s.goto("/dashboard");
  await s.page.locator("button").filter({ has: s.page.locator("span", { hasText: "Hoveniersbedrijf De Vries" }) }).first().click({ timeout: 5000 });
  await s.page.waitForTimeout(700);
  await s.page.getByText("Groenstijl Tuinen", { exact: false }).first().click({ timeout: 5000 });
  await s.page.waitForLoadState("networkidle").catch(() => {});
  await s.page.waitForTimeout(800);
  const naam = await s.page.evaluate(() => [...document.querySelectorAll("button span")].map((e) => e.innerText.trim()).find((t) => /Groenstijl|Hoveniers/.test(t)));
  console.log("actief bedrijf in knop:", naam);
  await s.goto("/dashboard/leads?weergave=lijst");
  await s.page.getByText("Gina Groen").first().click({ timeout: 5000 });
  await s.page.waitForTimeout(800);
  const href = await s.page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).find((h) => /offerte/.test(h || "") && /leads/.test(h || "")));
  console.log("offerte-link:", href);
  if (href) { await s.goto(href); }
  await s.page.waitForTimeout(800);
  const t = await s.page.evaluate(() => document.querySelector("main")?.innerText.replace(/\n{2,}/g, "\n").slice(0, 1200));
  console.log(t);
  await s.page.screenshot({ path: "/home/user/Kostenplan/test-results/screens/document-checker-1/ui-groenstijl-offerte-scherm.png" });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
