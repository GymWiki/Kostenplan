import { test, expect } from "./fixtures";

// #75: op mobiel sprong "Volgende" bij de onderdelen-stap meteen naar de editor (de knop werd tijdens de tik een submit-knop).
test("mobiel: Volgende bij de onderdelen-stap toont stap 3 (tarief), pas daarna maak je de rekentool (#75)", async ({ page }, info) => {
  test.skip(info.project.name !== "mobiel", "het stappenformulier bestaat alleen op mobiel");
  await page.goto("/probeer");
  await expect(page.getByRole("group", { name: "Stap 1 van 3" })).toBeVisible();
  const bar = page.locator("[data-actiebalk]");
  await page.getByRole("button", { name: "Overslaan" }).click();
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

// Website-stap van de gast-flow: Overslaan gaat altijd door, Verder alleen met een geldige website.
test.describe("gast: stap 'Wat is je website?' (mobiel)", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "mobiel", "het stappenformulier bestaat alleen op mobiel");
  });

  for (const invoer of ["", "geen website", "www."]) {
    test(`Overslaan met ${invoer === "" ? "een leeg veld" : `"${invoer}"`} gaat door; de tekst blijft staan`, async ({ page }) => {
      await page.goto("/probeer");
      if (invoer) await page.locator("#site").fill(invoer);
      await page.getByRole("button", { name: "Overslaan" }).click();
      await expect(page.getByRole("group", { name: "Stap 2 van 3" })).toBeVisible();
      await page.locator("[data-actiebalk]").getByRole("button", { name: "Terug" }).click();
      await expect(page.locator("#site")).toHaveValue(invoer);
    });
  }

  test("Overslaan met een geldige website gaat ook door", async ({ page }) => {
    await page.goto("/probeer");
    await page.locator("#site").fill("jouwtuinbedrijf.nl");
    await page.getByRole("button", { name: "Overslaan" }).click();
    await expect(page.getByRole("group", { name: "Stap 2 van 3" })).toBeVisible();
  });

  for (const invoer of ["", "geen website", "javascript:alert(1)"]) {
    test(`Verder met ${invoer === "" ? "een leeg veld" : `"${invoer}"`} gaat niet door en toont een melding`, async ({ page }) => {
      await page.goto("/probeer");
      await page.locator("#site").fill(invoer);
      await page.locator("[data-actiebalk]").getByRole("button", { name: "Verder" }).click();
      await expect(page.getByRole("group", { name: "Stap 1 van 3" })).toBeVisible();
      await expect(page.getByRole("alert").filter({ hasText: "Vul een geldige website in" })).toBeVisible();
      await expect(page.locator("#site")).toHaveAttribute("aria-invalid", "true");
    });
  }

  test("Verder met www.voorbeeld.nl (zonder https://) gaat door", async ({ page }) => {
    await page.goto("/probeer");
    await page.locator("#site").fill("www.voorbeeld.nl");
    await page.locator("[data-actiebalk]").getByRole("button", { name: "Verder" }).click();
    await expect(page.getByRole("group", { name: "Stap 2 van 3" })).toBeVisible();
  });

  test("na Overslaan met een rekentool maken: geen crash, geen 'undefined', geen website gebruikt", async ({ page }) => {
    const verzoeken: string[] = [];
    page.on("request", (r) => r.url().includes("/api/branding/voorbeeld") && verzoeken.push(r.url()));
    await page.goto("/probeer");
    await page.locator("#site").fill("jouwtuinbedrijf.nl");
    await page.locator("#site").fill("onzin zonder punt");
    await page.getByRole("button", { name: "Overslaan" }).click();
    await page.locator("label:has(input[name=preset])").first().click();
    const bar = page.locator("[data-actiebalk]");
    await bar.getByRole("button", { name: "Volgende" }).click();
    await page.locator("#tarief").fill("75");
    await bar.getByRole("button", { name: "Maak mijn rekentool" }).click();
    await page.waitForURL(/\/probeer\/editor(\?(?!logo=mislukt).*)?$/, { timeout: 20000 });
    await expect(page.locator("body")).not.toContainText(/undefined|null|NaN/);
    expect(verzoeken).toHaveLength(0);
  });

  for (const breedte of [360, 390, 430]) {
    test(`${breedte} px: knoppen ≥ 44 px, niets loopt uit`, async ({ page }) => {
      await page.setViewportSize({ width: breedte, height: 800 });
      await page.goto("/probeer");
      const overslaan = page.getByRole("button", { name: "Overslaan" });
      const verder = page.locator("[data-actiebalk]").getByRole("button", { name: "Verder" });
      expect((await overslaan.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect((await verder.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});

test.describe("gast: website-stap (computer, alle vragen onder elkaar)", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "alleen computer");
  });

  test("Overslaan gaat naar de volgende vraag; een ongeldige website blokkeert het maken niet-stil", async ({ page }) => {
    await page.goto("/probeer");
    await page.locator("#site").fill("geen website");
    await page.getByRole("button", { name: "Maak mijn rekentool" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Vul een geldige website in" })).toBeVisible();
    await expect(page).toHaveURL(/\/probeer$/);
    await page.getByRole("button", { name: "Overslaan" }).click();
    await expect(page.locator("input[name=preset]").first()).toBeFocused();
    await page.getByRole("button", { name: "Maak mijn rekentool" }).click();
    await page.waitForURL(/\/probeer\/editor/, { timeout: 20000 });
  });
});
