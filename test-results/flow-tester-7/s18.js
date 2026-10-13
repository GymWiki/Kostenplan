const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Hoveniersbedrijf De Vries");
  const r = await p.request.get("http://localhost:3200/api/facturen/export?formaat=zip&ubl=1");
  console.log("export status", r.status(), r.headers()["content-type"], (await r.body()).length, "bytes");
  await s.goto2("/dashboard/profiel/bedrijfsgegevens");
  s.stap(); await p.getByRole("button", { name: "Bedrijf verwijderen" }).click();
  await p.waitForTimeout(300);
  const form = p.locator("form").filter({ hasText: "Definitief verwijderen" });
  console.log("na export, paneel:", (await form.innerText()).replace(/\n+/g, " | ").slice(0, 420));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
