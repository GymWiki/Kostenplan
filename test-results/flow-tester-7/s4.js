const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/profiel/bedrijfsgegevens");
  s.stap(); await p.getByLabel("Website").fill("https://www.groenstijl-tuinen.nl");
  await p.waitForTimeout(2500);
  const regels = (await p.locator("body").innerText()).split("\n").filter((l) => /pgeslagen|pslaan|ijziging|aved/.test(l));
  console.log("tekst na typen:", regels);
  await s.scherm("groen-website-ingevuld");
  await s.goto2("/dashboard/profiel/bedrijfsgegevens");
  console.log("website na reload:", await p.getByLabel("Website").inputValue());
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
