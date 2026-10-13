const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await p.goto(k_base() + "/dashboard/leads/cmv6wswof00ds9c7ditpi67yx/offerte", { waitUntil: "networkidle" });
  await p.waitForTimeout(6000);
  console.log("url:", p.url());
  console.log("tekst:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 1500));
  await s.scherm("groen-offerte-editor-2");
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
function k_base(){ return "http://localhost:3200"; }
