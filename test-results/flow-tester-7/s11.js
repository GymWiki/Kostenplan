const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  s.stap(); await p.getByText("Hans Heg").first().click();
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  const b = p.getByRole("button", { name: "Offerte maken" });
  console.log("count", await b.count(), "disabled", await b.first().isDisabled().catch(()=>"?"));
  s.stap(); await b.first().click({ timeout: 5000 }).catch((e) => console.log("klik:", e.message.slice(0, 200)));
  await p.waitForTimeout(2000);
  console.log("url na klik:", p.url());
  console.log("dialoog:", await p.locator('[role="dialog"]').allInnerTexts().then(x=>x.join(" || ").slice(0,600)).catch(()=>"geen"));
  await s.scherm("groen-offerte-maken-klik");
  console.log("toasts:", await p.locator('[role="status"], [role="alert"]').allInnerTexts());
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
