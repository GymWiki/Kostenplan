const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/profiel/bedrijfsgegevens");
  s.stap(); await p.getByRole("button", { name: "Bedrijf verwijderen" }).click();
  await p.waitForTimeout(400);
  const form = p.locator("form").filter({ hasText: "Definitief verwijderen" });
  console.log("== Groenstijl paneel:\n" + (await form.innerText()).replace(/\n+/g, " | "));
  s.stap(); await p.getByLabel(/Typ “/).fill("Groenstijl Tuinen");
  console.log("knop (juiste naam) disabled:", await form.getByRole("button", { name: /Definitief|Bezig/ }).isDisabled());
  await s.scherm("verwijderen-groenstijl");
  await s.goto2("/dashboard/profiel/abonnement");
  const t = (await p.locator("body").innerText());
  console.log("Abonnement wijzigen aanwezig op abonnementpagina:", t.includes("Abonnement wijzigen"), "| knoppen:", await p.locator("button:visible, a:visible").evaluateAll((els) => els.map((e) => e.innerText.trim().replace(/\n/g," ")).filter((x) => /wijzig|Wijzig|Downgrade|Opzeg|opzeg|Kies/.test(x))));
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
