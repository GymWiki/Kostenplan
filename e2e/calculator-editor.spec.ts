import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, pdokNep } from "./fixtures";

// De editor: weergave en plaatsing kiezen (de rekentool in het midden wisselt direct mee), tegel per onderdeel en varianten per plek op de site.
// Alleen desktop (de mobiele editor heeft een eigen indeling); hovenier A2.
// Een keuze in een radiogroep: via het label, zoals een gebruiker (de radio zelf is visueel verborgen).
const kies = (page: import("@playwright/test").Page, groep: string, tekst: RegExp) => page.getByRole("radiogroup", { name: groep }).locator("label").filter({ hasText: tekst }).click();
// Met een werkgebied vraagt de rekentool eerst het adres (ook in het voorbeeld).
async function adresInVoorbeeld(page: import("@playwright/test").Page) {
  const voorbeeld = page.frameLocator('iframe[title^="Voorbeeld van"]');
  await expect(async () => {
    if (await voorbeeld.locator("[data-onderdeel]").first().isVisible()) return;
    await voorbeeld.locator("#wg-adres").fill("8011AB 5");
    await voorbeeld.getByRole("option").first().click({ timeout: 3000 });
  }).toPass({ timeout: 30000 });
}
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

test.describe("editor: weergave en plaatsing", () => {
  test.use({ gebruiker: "a2" });
  // Deze tests wijzigen de weergave van de rekentool of hangen ervan af: één tegelijk per hovenier (zie toolSlot in fixtures.ts).
test.beforeEach(async ({ toolSlot }) => {
  void toolSlot;
});

test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, info) => test.skip(info.project.name === "mobiel", "de mobiele editor heeft een eigen indeling"));

  test("een andere weergave kiezen: direct zichtbaar in het voorbeeld en bewaard", async ({ page, axe }) => {
    const toolId = seed().a2.tools.tuinaanleg;
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${toolId}'`);
    await page.goto(`/dashboard/tools/${toolId}?paneel=weergave`);
    await rustig(page);
    await pdokNep(page.context());
    const voorbeeld = page.frameLocator('iframe[title^="Voorbeeld van"]');
    await expect(voorbeeld.getByRole("heading", { name: "Stel je project samen" })).toBeVisible({ timeout: 20000 });
    await adresInVoorbeeld(page);

    await kies(page, "Weergave", /Tegels/);
    await expect(voorbeeld.getByRole("heading", { name: "Waar kunnen we je mee helpen?" })).toBeVisible({ timeout: 15000 });
    await kies(page, "Weergave", /Stappen/);
    await expect(voorbeeld.getByRole("progressbar")).toBeVisible({ timeout: 15000 });
    await kies(page, "Weergave", /Tegels/);
    await axe("editor: weergave");

    // Bewaard (autosave).
    await expect.poll(() => sql(`SELECT "weergaveConfig"->>'weergave' FROM "Tool" WHERE id = '${toolId}'`), { timeout: 10000 }).toBe("tegels");

    // Eigen kop.
    await page.getByLabel("Kop boven de onderdelen").fill("Wat heb je nodig?");
    await expect(voorbeeld.getByRole("heading", { name: "Wat heb je nodig?" })).toBeVisible({ timeout: 15000 });
  });

  test("tegel per onderdeel: eigen tekst en maat voor de vanaf-prijs", async ({ page }) => {
    const toolId = seed().a2.tools.tuinaanleg;
    const schutting = seed().a2.products[1];
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{"weergave":"tegels"}'::jsonb WHERE id = '${toolId}'`);
    await page.goto(`/dashboard/tools/${toolId}?paneel=${encodeURIComponent(`werkzaamheid:${schutting}`)}`);
    await rustig(page);
    await pdokNep(page.context());
    await adresInVoorbeeld(page);
    await page.getByLabel("Eigen tekst op de tegel").fill("Houten en betonnen schuttingen");
    const voorbeeld = page.frameLocator('iframe[title^="Voorbeeld van"]');
    await expect(voorbeeld.getByText("Houten en betonnen schuttingen")).toBeVisible({ timeout: 15000 });
    await expect.poll(() => sql(`SELECT "weergaveConfig"->'onderdelen'->'${schutting}'->>'tegelTekst' FROM "Tool" WHERE id = '${toolId}'`), { timeout: 10000 }).toBe("Houten en betonnen schuttingen");
    // De maat voor de vanaf-prijs accepteert een komma en weigert onzin.
    const maat = page.getByLabel(/Maat voor de vanaf-prijs/);
    await maat.fill("12,5");
    await expect.poll(() => sql(`SELECT "weergaveConfig"->'onderdelen'->'${schutting}'->>'voorbeeldmaat' FROM "Tool" WHERE id = '${toolId}'`), { timeout: 10000 }).toBe("12.5");
    await maat.fill("abc");
    await expect(page.getByText("Vul een getal groter dan 0 in, bijvoorbeeld 12,5.")).toBeVisible();
  });

  test("plaatsing en varianten geven de juiste code", async ({ page }) => {
    const toolId = seed().a2.tools.tuinaanleg;
    const schutting = seed().a2.products[1];
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${toolId}'`);
    await page.goto(`/dashboard/tools/${toolId}?paneel=weergave`);
    await rustig(page);
    await kies(page, "Plaatsing", /Knop met pop-up/);
    await page.getByLabel("Tekst op de knop").fill("Bereken je tuin");
    await expect.poll(() => sql(`SELECT "weergaveConfig"->>'knopTekst' FROM "Tool" WHERE id = '${toolId}'`), { timeout: 10000 }).toBe("Bereken je tuin");
    await page.getByRole("button", { name: "Terug naar overzicht" }).click();
    await page.goto(`/dashboard/tools/${toolId}?paneel=website`);
    await rustig(page);
    await expect.poll(() => sql(`SELECT "weergaveConfig"->>'plaatsing' FROM "Tool" WHERE id = '${toolId}'`), { timeout: 10000 }).toBe("popup");
    await expect(page.locator("pre, code, textarea").filter({ hasText: 'data-plaatsing="popup"' }).first()).toContainText('data-knop="Bereken je tuin"');

    // Een variant voor één onderdeel, in de pagina.
    await page.getByRole("button", { name: "Variant maken" }).click();
    const kaart = page.locator("section").filter({ hasText: "Varianten voor andere plekken" });
    await kaart.getByLabel("Naam van de variant").fill("Alleen schutting");
    await kaart.getByLabel("Schutting", { exact: true }).check();
    const code = kaart.getByLabel("Code");
    await expect(code).toHaveValue(new RegExp(`data-onderdelen="${schutting}"`));
    await expect(code).not.toHaveValue(/data-plaatsing/);
    await expect(kaart.getByText("Eén onderdeel: je klant ziet meteen de berekening")).toBeVisible();
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${toolId}'`);
  });
});
