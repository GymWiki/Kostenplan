const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { execSync } = require("child_process");
const tel = (id) => execSync(`psql -h /tmp -p 5433 -U postgres kp -t -c "select count(*) from \\"FactuurBetaling\\" where \\"factuurId\\"='${id}'"`).toString().trim();
(async () => {
  for (const [label, netwerk, factuur] of [["sync", null, "betaald"], ["dblclick-slow3g","slow3g","concept"]]) {
    const s = await k.open({ agent: "verifier-06", gebruiker: "a1", viewport: "desktop", pad: null, netwerk: netwerk });
    const id = s.seed.a1.facturen[label==="sync"?"verstuurd":"te-laat"];
    await s.goto("/dashboard/facturen/" + id);
    const voor = tel(id);
    await s.page.getByRole("button", { name: "Betaling registreren" }).click();
    await s.page.getByLabel("Bedrag (€)").fill("1,25");
    const knop = s.page.getByRole("button", { name: "Betaling opslaan" });
    if (label === "sync") await knop.evaluate((b) => { b.click(); b.click(); }); else await knop.dblclick();
    await s.page.waitForTimeout(5000);
    console.log(label, "voor", voor, "na", tel(id));
    await s.sluit();
  }
})();
