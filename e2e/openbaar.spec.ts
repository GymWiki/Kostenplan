import { test, expect, dynamisch, rustig } from "./fixtures";

// Openbare pagina's (zonder inlog): laden zonder fouten, geen horizontaal scrollen, axe, visuele basislijn.
const PAGINA_S = [
  ["landing", "/"],
  ["prijzen", "/prijzen"],
  ["login", "/login"],
  ["registreren", "/registreren"],
  ["probeer", "/probeer"],
  ["voorbeelden", "/voorbeelden-rekentools"],
] as const;

for (const [naam, pad] of PAGINA_S) {
  test.describe(`openbaar: ${naam}`, () => {
    test("laadt zonder fouten en zonder horizontaal scrollen", async ({ page }) => {
      const fouten: string[] = [];
      page.on("pageerror", (e) => fouten.push(e.message));
      const r = await page.goto(pad);
      expect(r?.status()).toBe(200);
      await rustig(page);
      expect(fouten).toEqual([]);
      const breder = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(breder, "horizontale scroll").toBe(false);
    });
    test("axe: geen serious/critical", async ({ page, axe }) => {
      await page.goto(pad);
      await rustig(page);
      await axe(naam);
    });
    test("visuele basislijn", async ({ page }) => {
      await page.goto(pad);
      await rustig(page);
      await expect(page).toHaveScreenshot(`${naam}.png`, { fullPage: false, mask: dynamisch(page) });
    });
  });
}
