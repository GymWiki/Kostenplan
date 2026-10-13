const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  s.stap(); await p.getByText("Hans Heg").first().click();
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  const t = (await p.locator("body").innerText()).replace(/\n+/g, " | ");
  console.log("deel2:", t.slice(1200, 2600));
  console.log("buttons:", await p.locator("button:visible, a:visible").evaluateAll((els) => els.map((e) => (e.innerText||"").trim().replace(/\n/g," ").slice(0,40)).filter(Boolean)));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
