const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  for (const naam of ["Hoveniersbedrijf De Vries", "Groenstijl Tuinen"]) {
    if (naam !== "Groenstijl Tuinen") { await s.wissel(naam); }
    await s.goto2("/dashboard/profiel/bedrijfsgegevens");
    s.stap(); await p.getByRole("button", { name: "Bedrijf verwijderen" }).click();
    await p.waitForTimeout(400);
    const form = p.locator("form").filter({ hasText: "Definitief verwijderen" });
    console.log(`\n== ${naam} paneel:\n` + (await form.innerText()).replace(/\n+/g, " | "));
    s.stap(); await p.getByLabel(/Typ “/).fill(naam.slice(0, 5));
    console.log("knop (verkeerde naam):", await form.getByRole("button", { name: /Definitief/ }).isDisabled());
    s.stap(); await p.getByLabel(/Typ “/).fill(naam);
    await p.waitForTimeout(300);
    console.log("knop (juiste naam):", await form.getByRole("button", { name: /Definitief|Bezig/ }).isDisabled());
    await p.getByLabel(/Typ “/).scrollIntoViewIfNeeded();
    await s.scherm(`verwijderen-${naam.split(" ")[0]}`);
    console.log("consoleFouten", s.consoleFouten);
  }
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
