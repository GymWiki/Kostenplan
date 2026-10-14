import { test, expect, seed, rustig, pdokNep } from "./fixtures";

// Beide projecten gebruiken hovenier A1; het slot voorkomt dat een andere spec ondertussen de weergave van die rekentool wijzigt.
test.use({ slotVoor: "a1" });
test.beforeEach(async ({ toolSlot }) => {
  void toolSlot;
});

// De embed (laadscript en iframe) tussen agressieve CSS van de host-site, en een volledige aanvraag door een klant.
const tool = () => seed().a1.tools.tuinaanleg;

for (const modus of ["script", "iframe"] as const) {
  test.describe(`embed (${modus})`, () => {
    test("de rekentool laadt in de host-pagina en erft de CSS van de host niet", async ({ page }) => {
      await pdokNep(page.context());
      await page.goto(`/test-embed?tool=${tool()}&modus=${modus}`);
      const frame = page.frameLocator("iframe").first();
      await expect(frame.getByText("Stel je project samen")).toBeVisible({ timeout: 20000 });
      const veld = frame.locator("#wg-adres");
      const font = await veld.evaluate((el) => getComputedStyle(el).fontFamily);
      expect(font).not.toMatch(/Comic/i);
      const maat = await veld.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(maat, "tekstgrootte van het invoerveld").toBeGreaterThanOrEqual(14);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), "horizontale scroll").toBe(false);
    });

    test("een klant rekent een prijs uit en verstuurt een aanvraag", async ({ page }) => {
      await pdokNep(page.context());
      await page.goto(`/test-embed?tool=${tool()}&modus=${modus}`);
      const frame = page.frameLocator("iframe").first();
      // Onder belasting kan de eerste invoer vóór de hydratatie vallen: opnieuw proberen tot het adres is bevestigd.
      await expect(async () => {
        await frame.locator("#wg-adres").fill("8011AB 5");
        await frame.getByRole("option").first().click({ timeout: 3000 });
      }).toPass({ timeout: 30000 });
      await frame.getByLabel(/Aantal Schutting/).fill("20");
      await frame.locator("select").first().selectOption({ index: 1 });
      // Gouden voorbeeld: 20 m Douglas-schutting = €1.700 materiaal + €180 arbeid + €35 voorrijkosten = €1.915 excl. = €2.317,15 incl. btw.
      await expect(frame.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)[\s\S]*€\s*2\.317,15/i);
    });
  });
}

test.describe("portaal (klant, eigen pagina)", () => {
  test("de portaalpagina laadt en axe vindt niets ernstigs", async ({ page, axe }) => {
    const s = seed().a1;
    const r = await page.goto(`/t/${s.bedrijfSlug}/${s.tuinaanlegSlug}`);
    expect(r?.status()).toBe(200);
    await rustig(page);
    await axe("portaal");
  });
});
