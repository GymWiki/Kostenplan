const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  s.stap(); await p.getByText("Hans Heg").first().click();
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  s.stap(); await p.getByRole("button", { name: /Zet op In contact/ }).first().click().catch((e)=>console.log("klik mislukt", e.message.slice(0,120)));
  await p.waitForTimeout(1500);
  console.log("na In contact:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 500));
  const knoppen = await p.locator("a, button").evaluateAll((els) => els.map((e) => (e.innerText||"").trim().replace(/\n/g," ").slice(0,40) + " " + (e.getAttribute("href")||"")).filter((x) => /offerte|Offerte|maken|Maak/.test(x)));
  console.log("offerte-knoppen:", knoppen);
  await s.scherm("groen-hans-in-contact");
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
