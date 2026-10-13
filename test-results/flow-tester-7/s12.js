const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  s.stap(); await p.getByText("Hans Heg").first().click();
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  s.stap(); await p.getByRole("button", { name: "Offerte maken" }).first().click();
  await p.waitForTimeout(800);
  s.stap(); await p.getByText("Offerte maken in Kostenplan").first().click();
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  console.log("url:", p.url());
  console.log("tekst:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 1500));
  await s.scherm("groen-offerte-editor");
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
