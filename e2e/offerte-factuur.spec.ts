import { test, expect, seed, rustig, eigenA } from "./fixtures";

// Van lead naar offerte, online akkoord, factuur, betaling. Kijkt naar de seed-data van hovenier A.
test.describe("offerte en factuur (hovenier)", () => {
  test.use({ gebruiker: "auto" });

  test("de offerte-editor opent voor een lead met een offerte", async ({ page, axe }, info) => {
    await page.goto(`/dashboard/leads/${seed()[eigenA(info.project.name)].leads["offerte-verstuurd"]}/offerte`);
    await rustig(page);
    await expect(page.locator("body")).toContainText(/Offerte|offerte/);
    await axe("offerte-editor");
  });

  test("factuur maken vanuit een akkoord: concept met watermerk", async ({ page }, info) => {
    await page.goto(`/dashboard/leads?lead=${seed()[eigenA(info.project.name)].leads["akkoord"]}`);
    await rustig(page);
    const d = page.getByRole("dialog");
    await expect(d.getByText("Stap 4 van 8: Akkoord")).toBeVisible();
    await d.getByRole("button", { name: "Factuur maken" }).first().click();
    await page.getByRole("button", { name: "Eén factuur voor het totaal" }).click();
    await page.waitForURL(/\/dashboard\/facturen\//);
    await rustig(page);
    await expect(page.locator("body")).toContainText(/Factuur \(concept\)|concept/i);
  });

  test("definitief maken is geblokkeerd zolang de stelpost en uitvoeringsdatum ontbreken", async ({ page }, info) => {
    await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen["concept"]}`);
    await rustig(page);
    await expect(async () => {
      await page.getByRole("button", { name: /Definitief maken/ }).and(page.locator(":visible")).first().click({ timeout: 3000 });
      await expect(page.getByText(/Na definitief maken krijgt deze factuur/)).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
  });

  test("een definitieve factuur is alleen-lezen en toont het beheerpaneel", async ({ page }, info) => {
    await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen["verstuurd"]}`);
    await rustig(page);
    await expect(page.getByText(/definitief en kan niet meer worden gewijzigd/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Betaling registreren" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Crediteren" })).toBeVisible();
  });

  test("een te late factuur toont 'te laat' en biedt een herinnering", async ({ page }, info) => {
    await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen["te-laat"]}`);
    await rustig(page);
    await expect(page.locator("section[aria-label='Beheer van deze factuur']")).toContainText(/\d+ dagen te laat/);
    await expect(page.getByRole("button", { name: /Herinnering sturen/ })).toBeVisible();
  });
});

test.describe("online offerte en factuur (klant, zonder inlog)", () => {
  test("online factuur: bedrag, IBAN en PDF; een ongeldige token geeft 404", async ({ page, request }) => {
    const tok = seed().a1.factuurTokens["verstuurd"];
    const r = await page.goto(`/f/${tok}`);
    expect(r?.status()).toBe(200);
    await expect(page.locator("body")).toContainText("Betaalgegevens");
    await expect(page.locator("body")).toContainText("NL91 ABNA");
    const pdf = await request.get(`/f/${tok}/pdf`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await request.get("/f/niet-bestaand-niet-bestaand-123")).status()).toBe(404);
  });

  test("een concept-factuur is niet bereikbaar voor de klant", async ({ request }) => {
    expect((await request.get(`/f/${seed().a1.factuurTokens["concept"]}`)).status()).toBe(404);
  });

  test("online offerte: de klant ziet de offerte en kan akkoord geven", async ({ page, axe }) => {
    const r = await page.goto(`/o/${seed().a1.offerteTokens["offerte-verstuurd"]}`);
    expect(r?.status()).toBe(200);
    await rustig(page);
    await expect(page.locator("body")).toContainText(/akkoord/i);
    await axe("online-offerte");
  });

  test("een verlopen offerte kan niet meer worden geaccepteerd", async ({ page }) => {
    await page.goto(`/o/${seed().a1.offerteTokens["offerte-verlopen"]}`);
    await rustig(page);
    await expect(page.locator("body")).toContainText(/verlopen/i);
  });
});
