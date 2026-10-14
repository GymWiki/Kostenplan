import { test, expect } from "./fixtures";

// #75: op mobiel sprong "Volgende" bij de onderdelen-stap meteen naar de editor (de knop werd tijdens de tik een submit-knop).
test("mobiel: Volgende bij de onderdelen-stap toont stap 3 (tarief), pas daarna maak je de rekentool (#75)", async ({ page }, info) => {
  test.skip(info.project.name !== "mobiel", "het stappenformulier bestaat alleen op mobiel");
  await page.goto("/probeer");
  await expect(page.getByRole("group", { name: "Stap 1 van 3" })).toBeVisible();
  const bar = page.locator("[data-actiebalk]");
  await bar.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByRole("group", { name: "Stap 2 van 3" })).toBeVisible();
  await page.locator("label:has(input[name=preset])").first().click();
  await bar.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByRole("group", { name: "Stap 3 van 3" })).toBeVisible();
  await expect(page).toHaveURL(/\/probeer$/);
  await expect(page.locator("#tarief")).toBeVisible();
  await page.locator("#tarief").fill("75");
  await bar.getByRole("button", { name: "Maak mijn rekentool" }).click();
  await page.waitForURL(/\/probeer\/editor/, { timeout: 20000 });
});
