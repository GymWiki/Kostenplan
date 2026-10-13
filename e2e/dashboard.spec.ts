import { test, expect, seed, eigenA, dynamisch, rustig } from "./fixtures";

// Hoofdschermen van de hovenier (testgebruiker A).

const SCHERMEN = [
  ["overzicht", "/dashboard"],
  ["rekentools", "/dashboard/tools"],
  ["leads", "/dashboard/leads"],
  ["facturen", "/dashboard/facturen"],
  ["profiel", "/dashboard/profiel"],
  ["bedrijfsgegevens", "/dashboard/profiel/bedrijfsgegevens"],
  ["werkgebied", "/dashboard/profiel/werkgebied"],
  ["offerte-instellingen", "/dashboard/profiel/offerte-instellingen"],
  ["abonnement", "/dashboard/profiel/abonnement"],
] as const;

for (const [naam, pad] of SCHERMEN) {
  test.describe(`dashboard: ${naam}`, () => {
    test.use({ gebruiker: "a1" });
    test("laadt, geen scriptfouten, geen horizontaal scrollen", async ({ page }) => {
      const fouten: string[] = [];
      page.on("pageerror", (e) => fouten.push(e.message));
      const r = await page.goto(pad);
      expect(r?.status()).toBe(200);
      await rustig(page);
      expect(fouten).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), "horizontale scroll").toBe(false);
    });
    test("axe: geen serious/critical", async ({ page, axe }) => {
      await page.goto(pad);
      await rustig(page);
      await axe(naam);
    });
    test("visuele basislijn", async ({ page }) => {
      await page.goto(pad);
      await rustig(page);
      await expect(page).toHaveScreenshot(`${naam}.png`, { mask: dynamisch(page) });
    });
  });
}

test.describe("leads: fasen en filters", () => {
  test.use({ gebruiker: "a1" });
  test("filterchips met aantallen; Te laat toont precies de te late lead", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await rustig(page);
    const chips = page.locator('div[role="group"][aria-label="Filter op fase"]:visible');
    await expect(chips.getByRole("button", { name: /^Te laat\s*2$/ })).toBeVisible();
    await chips.getByRole("button", { name: /^Te laat/ }).click();
    // Lotte (30 dagen geleden gefactureerd) en Carla (15 dagen: één dag te laat).
    const zichtbaar = (t: string) => page.getByText(t).and(page.locator(":visible"));
    await expect(zichtbaar("Lotte Laat").first()).toBeVisible();
    await expect(zichtbaar("Carla Credit").first()).toBeVisible();
    await expect(zichtbaar("Nina Nieuw")).toHaveCount(0);
  });
  test("een nieuwe lead staat op stap 1 met één volgende actie", async ({ page }) => {
    await page.goto(`/dashboard/leads?lead=${seed().a1.leads["nieuw"]}`);
    await rustig(page);
    const dialoog = page.getByRole("dialog");
    await expect(dialoog.getByText("Stap 1 van 8: Nieuw")).toBeVisible();
    await expect(dialoog.getByRole("button", { name: /Volgende:.*Zet op In contact/ })).toHaveCount(1);
  });
  test("een verloren lead toont de reden en kan weer worden opengezet", async ({ page }) => {
    await page.goto(`/dashboard/leads?lead=${seed().a1.leads["verloren"]}`);
    await rustig(page);
    await expect(page.getByRole("dialog").getByText("Reden: Te duur")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Zet weer open" })).toBeVisible();
  });
});

test.describe("overzicht: facturen", () => {
  test.use({ gebruiker: "a1" });
  test("tellers Te factureren, Openstaand en Te laat", async ({ page }, info) => {
    void eigenA(info.project.name);
    await page.goto("/dashboard");
    await rustig(page);
    const sectie = page.locator("section[aria-labelledby=fact-tellers]:visible").first();
    await expect(sectie).toContainText("Te factureren");
    await expect(sectie).toContainText("Openstaand");
    await expect(sectie).toContainText("Te laat");
    await expect(sectie).toContainText(/dagen? te laat/);
  });
});
