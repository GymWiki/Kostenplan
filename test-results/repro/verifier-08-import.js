// Herhaling: /probeer (desktop-submit) -> Account maken -> registreren met nieuw account -> /probeer/importeren.
// Daarna: onboarding doorlopen tot Rekentools.
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-08", viewport: "desktop", pad: "/probeer" });
  const p = s.page;
  const mail = `verifier08-${Date.now().toString(36)}@test.kostenplan.nl`;
  await p.getByRole("button", { name: "Maak mijn rekentool" }).first().click();
  await p.waitForURL(/probeer\/editor/);
  await p.waitForTimeout(1500);
  await s.scherm("editor");
  console.log("editor-knoppen:", (await p.getByRole("button").allInnerTexts()).join(" | ").slice(0, 400));
  console.log("editor-links:", (await p.getByRole("link").allInnerTexts()).join(" | ").slice(0, 400));
  const acc = p.getByRole("link", { name: /account/i }).first();
  if (await acc.count()) await acc.click(); else { await p.getByRole("button", { name: /account maken|Meer acties/i }).first().click(); await p.getByRole("menuitem", { name: /account/i }).first().click().catch(()=>{}); }
  await p.waitForTimeout(1500);
  console.log("url na account-klik:", p.url());
  await p.locator("#email").fill(mail);
  await p.locator("#password").fill("Testwachtwoord1!");
  const t0 = Date.now();
  await p.getByRole("button", { name: /Gratis account aanmaken/i }).click();
  await p.waitForURL(/importeren|onboarding|dashboard/, { timeout: 30000 }).catch(() => {});
  console.log("url na registreren:", p.url());
  // wacht op einduitkomst
  for (let i = 0; i < 40; i++) { const t = await p.locator("body").innerText(); if (/Dat ging niet goed|Je rekentool staat|onboarding/i.test(t) || !/probeer\/importeren/.test(p.url())) break; await p.waitForTimeout(1000); }
  console.log("na", Math.round((Date.now() - t0) / 1000), "s:", p.url(), "|", (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
  await s.scherm("na-import");
  console.log("netwerkfouten:", s.netwerkFouten, "console:", s.consoleFouten);
  console.log("MAIL", mail);
  await s.sluit();
})();
