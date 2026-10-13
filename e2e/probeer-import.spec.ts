import { test, expect } from "./fixtures";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cookie, GEBRUIKERS } = require("../scripts/test/ids.js");

// #72: na registreren liep "rekentool overnemen" vast (slug-query buiten de transactie, pool van 1 verbinding) en gaf een 500.
test("een voorbeeld uit /probeer wordt na inloggen overgenomen: de rekentool staat in het dashboard (#72)", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name === "mobiel", "de import is niet apparaatafhankelijk; het stappenformulier op mobiel wordt in #75 apart getest");
  await page.goto("/probeer");
  await page.locator("label:has(input[name=preset])").first().click();
  await page.locator("#tarief").fill("75");
  await page.getByRole("button", { name: /Maak mijn rekentool/ }).and(page.locator(":visible")).first().click();
  await page.waitForURL(/\/probeer\/editor/, { timeout: 20000 });

  // account aanmaken = hier: inloggen als de nieuwe testgebruiker (zonder bedrijf); de browser bewaart het voorbeeld.
  await context.addCookies([cookie(GEBRUIKERS.nieuw, baseURL)]);
  await page.goto("/probeer/importeren");
  await page.waitForURL(/\/dashboard\/tools\/[^/?]+\?paneel=website/, { timeout: 30000 });
  await expect(page.locator("body")).not.toContainText(/Je voorbeeld overnemen is niet gelukt|Internal Server Error|Application error/);
});
