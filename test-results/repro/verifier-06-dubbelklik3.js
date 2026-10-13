const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { execSync } = require("child_process");
const tel = (id) => execSync(`psql -h /tmp -p 5433 -U postgres kp -t -c "select count(*) from \\"FactuurBetaling\\" where \\"factuurId\\"='${id}'"`).toString().trim();
(async () => {
  const s = await k.open({ agent: "verifier-06", gebruiker: "a1", viewport: "desktop", pad: null });
  const id = s.seed.a1.facturen.verstuurd;
  for (let i = 0; i < 6; i++) {
    await s.goto("/dashboard/facturen/" + id);
    const voor = tel(id);
    await s.page.getByRole("button", { name: "Betaling registreren" }).click();
    await s.page.getByLabel("Bedrag (€)").fill("0,10");
    await s.page.getByRole("button", { name: "Betaling opslaan" }).dblclick({ delay: 0 });
    await s.page.waitForTimeout(2500);
    console.log("dblclick", i, voor, "->", tel(id));
  }
  await s.sluit();
})();
