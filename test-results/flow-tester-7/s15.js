const start = require("./lib.js");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  for (const pad of ["abonnement", "huisstijl", "werkgebied", "offerte-instellingen", "account", "meldingen"]) {
    await s.goto2(`/dashboard/profiel/${pad}`);
    const t = (await p.locator("body").innerText()).replace(/\n+/g, " | ");
    console.log(`\n== ${pad} (${p.url().replace("http://localhost:3200","")})\n${t.slice(0, 900)}`);
    await s.scherm(`groen-${pad}`);
  }
  console.log("\nconsoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
