import { test, expect, rustig } from "./fixtures";

// Een nieuwe gebruiker: account aanmaken, bedrijf aanmaken, aankomen in het dashboard.
test("registreren → bedrijf aanmaken → Overzicht", async ({ page }, info) => {
  const email = `nieuw-${info.project.name}-${Date.now()}@test.kostenplan.nl`;
  await page.goto("/registreren");
  await rustig(page);
  await page.getByLabel(/e-?mail/i).first().fill(email);
  await page.getByLabel(/wachtwoord/i).first().fill("Testwachtwoord1!");
  const tweede = page.getByLabel(/herhaal|bevestig/i);
  if (await tweede.count()) await tweede.first().fill("Testwachtwoord1!");
  await page.getByRole("button", { name: /account aanmaken|registreren|aanmelden/i }).click();
  await page.waitForURL(/onboarding|dashboard/, { timeout: 20000 });
  if (/onboarding/.test(page.url())) {
    await page.getByLabel(/naam/i).first().fill("Testtuinen BV");
    await page.getByRole("button", { name: /doorgaan|aanmaken|opslaan|volgende/i }).first().click();
    await page.waitForURL(/dashboard/, { timeout: 20000 });
  }
  await rustig(page);
  await expect(page.locator("body")).toContainText(/Overzicht|Welkom/);
});

test("inloggen met een fout wachtwoord geeft een duidelijke melding", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).first().fill("niemand@test.kostenplan.nl");
  await page.getByLabel(/wachtwoord/i).first().fill("x");
  await page.getByRole("button", { name: /inloggen/i }).click();
  await expect(page.locator("body")).toContainText(/onjuist|ongeldig|niet gelukt|e-?mail/i);
});
