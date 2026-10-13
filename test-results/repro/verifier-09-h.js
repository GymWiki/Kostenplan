const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const bl = async (p) => (await p.getByText(/heeft nog geen werkelijke hoeveelheid|Dit moet eerst/).allInnerTexts());
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/facturen/cmv71embe003jb07d715kgnul" });
  const p = s.page; await p.waitForTimeout(1200);
  await p.getByText("Te bepalen bij nacalculatie").first().click();
  await p.waitForTimeout(600);
  // stap A: aantal 1 opnieuw typen (zelfde waarde)
  await p.locator("#rg-aantal").fill("1"); await p.locator("#rg-aantal").blur(); await p.waitForTimeout(1500);
  console.log("A (zelfde aantal):", await bl(p));
  // stap B: soort-regel naar normaal (is al 'normaal' in select)
  console.log("rg-type", await p.locator("#rg-type").inputValue());
  // stap C: prijs wijzigen
  await p.locator("#rg-aantal").fill("2"); await p.locator("#rg-aantal").blur(); await p.waitForTimeout(1500);
  console.log("C (aantal=2):", await bl(p), "toel:", await p.locator("#rg-toel").inputValue());
  await s.scherm("na-aantal-2");
  // datum
  console.log("VELDEN uitvoeringsdatum:", await p.getByText("nog invullen").count());
  await p.getByText("nog invullen").first().click(); await p.waitForTimeout(500);
  const ds = await p.locator("input[type=date]").evaluateAll(e=>e.map(x=>x.id+":"+x.value));
  console.log("DATE INPUTS", ds);
  await s.sluit();
})();
