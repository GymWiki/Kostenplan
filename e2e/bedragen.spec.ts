import { test, expect, seed, rustig, eigenA } from "./fixtures";

// #70: "12.50" werd 1.250,00. #77: een betaling met punt werd geweigerd. Eén gedeelde parser voor alle bedragvelden.
test.describe("bedragen typen (hovenier)", () => {
  test.use({ gebruiker: "auto" });

  test("offerte-editor: 12.50, 1.250,50 en ongeldige invoer in het prijsveld (#70)", async ({ page }, info) => {
    await page.goto(`/dashboard/leads/${seed()[eigenA(info.project.name)].leads["offerte-concept"]}/offerte`);
    await rustig(page);
    await expect(async () => {
      if (info.project.name === "mobiel") {
        await page.getByRole("button", { name: /^Onderdelen/ }).click({ timeout: 3000 });
        await page.getByRole("button", { name: /Bestrating terras/ }).click({ timeout: 3000 });
      } else {
        await page.locator("tr.og-wijzigbaar:has(input[value^=\"Bestrating terras\"])").and(page.locator(":visible")).first().locator("td").last().click({ timeout: 3000 });
      }
      await expect(page.locator("#rg-prijs")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
    const prijs = page.locator("#rg-prijs");

    await prijs.fill("12.50");
    await prijs.blur();
    await expect(prijs).toHaveValue("12,50");

    await prijs.fill("1.250,50");
    await prijs.blur();
    await expect(prijs).toHaveValue("1250,50");

    // ongeldig: melding bij het veld, vorige geldige waarde blijft staan (geen stille 0)
    await prijs.fill("abc");
    await expect(page.locator("#rg-prijs-fout")).toContainText("Vul een geldig bedrag in");
    await prijs.fill("-5");
    await expect(page.locator("#rg-prijs-fout")).toContainText("onder nul");
    await prijs.fill("€ 12,5");
    await prijs.blur();
    await expect(prijs).toHaveValue("12,50");
    await expect(page.locator("#rg-prijs-fout")).toHaveCount(0);
  });

  test("betaling registreren met een punt als decimaalteken wordt geaccepteerd (#77)", async ({ page }, info) => {
    await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen["verstuurd"]}`);
    await rustig(page);
    await page.getByRole("button", { name: "Betaling registreren" }).click();
    const bedrag = page.locator("#bt-bedrag");
    await bedrag.fill("abc");
    await page.getByRole("button", { name: "Betaling opslaan" }).last().click();
    await expect(page.locator("#bt-bedrag-fout")).toContainText("Vul een geldig bedrag in");
    await bedrag.fill("10.50");
    await page.getByRole("button", { name: "Betaling opslaan" }).last().click();
    await expect(page.locator("section[aria-label='Beheer van deze factuur']")).toContainText(/10,50/, { timeout: 15000 });
  });
});
