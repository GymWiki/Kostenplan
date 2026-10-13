const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  s.stap(); await p.getByText("Gina Groen").first().click();
  await p.waitForLoadState("networkidle");
  console.log("lead URL:", p.url());
  await s.scherm("groen-lead");
  console.log("lead tekst:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 900));
  const links = await p.locator("a[href*='offerte']").evaluateAll((els) => els.map((e) => `${e.innerText.trim().slice(0,40)} -> ${e.getAttribute("href")}`));
  console.log("offerte-links:", links);
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
