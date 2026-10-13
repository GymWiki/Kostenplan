// Seed-lead (kunstmatige snapshot, geen rekenkern) -> offerte-editor a3: welk totaal?
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const h = await k.open({ agent: "verifier-08", gebruiker: "a3", viewport: "desktop", pad: null });
  await h.goto("/dashboard/leads/cmv70sc8800ap9s7djy4n6ozs/offerte");
  await h.page.waitForTimeout(3000);
  const doc = h.page.locator("[data-offerte-document]");
  console.log((await doc.innerText()).replace(/\s+/g, " ").slice(0, 900));
  await h.scherm("seedlead-offerte");
  await h.sluit();
})();
