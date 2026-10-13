// Vervolg: zelfde stroom, daarna Opnieuw proberen en Doorgaan zonder voorbeeld; toont wat er in Rekentools staat.
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-08", viewport: "desktop", pad: "/probeer" });
  const p = s.page;
  // geen draft in deze browser: eerst een voorbeeld maken
  await s.goto("/probeer");
  await p.getByRole("button", { name: "Maak mijn rekentool" }).first().click();
  await p.waitForURL(/probeer\/editor/); await p.waitForTimeout(1500);
  await p.getByRole("button", { name: /account maken/i }).first().click(); await p.waitForTimeout(1500);
  await p.locator("#email").fill(`verifier08-${Date.now().toString(36)}@test.kostenplan.nl`);
  await p.locator("#password").fill("Testwachtwoord1!");
  await p.getByRole("button", { name: /Gratis account aanmaken/i }).click();
  await p.waitForSelector("text=Dat ging niet goed", { timeout: 30000 });
  console.log("1e poging mislukt");
  await p.getByRole("button", { name: "Opnieuw proberen" }).click();
  await p.waitForSelector("text=Dat ging niet goed", { timeout: 30000 }); await p.waitForTimeout(500);
  console.log("2e poging (Opnieuw proberen) ook mislukt; netwerk:", s.netwerkFouten);
  await p.getByRole("button", { name: /Doorgaan zonder voorbeeld/ }).click();
  await p.waitForTimeout(2500); console.log("url:", p.url());
  console.log((await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 250));
  await p.getByLabel("Bedrijfsnaam").fill("Verifier Hoveniers");
  await p.getByRole("button", { name: "Bedrijf aanmaken" }).click(); await p.waitForTimeout(3000); console.log("onboarding ->", p.url());
  for (let i = 0; i < 3 && /onboarding/.test(p.url()); i++) { const b = p.getByRole("button", { name: /Volgende|Doorgaan|Afronden|Opslaan|Klaar|Overslaan|Naar/i }).first(); if (await b.count()) await b.click().catch(() => {}); await p.waitForTimeout(2500); console.log("->", p.url()); }
  await s.goto("/dashboard/tools");
  console.log((await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400));
  await s.sluit();
})();
