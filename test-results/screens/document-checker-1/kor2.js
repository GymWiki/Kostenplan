const fs = require("fs");
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 150 });
  const info = await s.page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => e.childElementCount === 0 && /Hoveniersbedrijf De Vries|Bedrijf wisselen/.test(e.textContent)).map((e) => `${e.tagName} role=${e.getAttribute("role")} aria=${e.getAttribute("aria-label")} cls=${(e.className || "").toString().slice(0, 60)} parent=${e.parentElement?.tagName}/${e.parentElement?.getAttribute("role")}`));
  console.log(info.join("\n"));
  const el = s.page.locator("button, [role=combobox], select, [role=button]").filter({ hasText: "Hoveniersbedrijf De Vries" }).first();
  console.log("count", await el.count());
  if (await el.count()) { await el.click({ timeout: 5000 }).catch((e) => console.log("klik", e.message.split("\n")[0])); await s.page.waitForTimeout(500); }
  const opties = await s.page.evaluate(() => [...document.querySelectorAll("[role=option],[role=menuitem],[role=menuitemradio],option")].map((e) => e.innerText.trim()).join(" | "));
  console.log("OPTIES: " + opties);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
