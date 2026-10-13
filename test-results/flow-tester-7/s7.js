const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  s.stap(); await p.getByText("Hans Heg").first().click();
  await p.waitForTimeout(1500); await p.waitForLoadState("networkidle");
  console.log("url:", p.url());
  console.log("tekst:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 900));
  await s.scherm("groen-hans-heg");
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
