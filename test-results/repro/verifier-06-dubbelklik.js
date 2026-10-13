const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { execSync } = require("child_process");
const tel = (id) => execSync(`psql -h /tmp -p 5433 -U postgres kp -t -c "select count(*) from \\"FactuurBetaling\\" where \\"factuurId\\"='${id}'"`).toString().trim();
(async () => {
  for (const modus of ["dblclick", "twee-clicks-snel"]) {
    const s = await k.open({ agent: "verifier-06", gebruiker: "a1", viewport: "desktop", pad: null });
    const id = s.seed.a1.facturen[modus === "dblclick" ? "verstuurd" : "te-laat"];
    await s.goto("/dashboard/facturen/" + id);
    const voor = tel(id);
    await s.page.getByRole("button", { name: "Betaling registreren" }).click();
    await s.page.getByLabel("Bedrag (€)").fill("12,5");
    const knop = s.page.getByRole("button", { name: "Betaling opslaan" });
    if (modus === "dblclick") await knop.dblclick(); else { await knop.click({ noWaitAfter: true }); await knop.click({ noWaitAfter: true, timeout: 500 }).catch(e=>console.log("2e klik:", e.message.split("\n")[0])); }
    await s.page.waitForTimeout(3000);
    console.log(modus, "voor", voor, "na", tel(id));
    await s.sluit();
  }
})();
