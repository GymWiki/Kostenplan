import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, pdokNep, eigenA } from "./fixtures";
import type { Page } from "@playwright/test";

// Weergaven van de klant-rekentool (tegels, stappen, alles op één pagina) op dezelfde data, rekenkern en aanvraag.
// Mobiel gebruikt hovenier A1, desktop A2: zo wijzigen de twee projecten elkaars rekentool niet.
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

test.describe.configure({ mode: "serial" });

const stel = (toolId: string, config: object) => sql(`UPDATE "Tool" SET "weergaveConfig" = '${JSON.stringify(config)}'::jsonb WHERE id = '${toolId}'`);

// Gouden voorbeeld: 20 m Douglas-schutting = €1.700 materiaal + €180 arbeid + €35 voorrijkosten = €1.915 excl. = €2.317,15 incl. btw.
const GOUD = /2\.317,15/;

async function open(page: Page, project: string, config: object) {
  const s = seed()[eigenA(project)];
  stel(s.tools.tuinaanleg, config);
  await pdokNep(page.context());
  await page.goto(`/t/${s.bedrijfSlug}/${s.tuinaanlegSlug}`);
  await rustig(page);
  // Onder belasting kan de eerste invoer vóór de hydratatie vallen: opnieuw proberen tot het adres is bevestigd.
  await expect(async () => {
    await page.locator("#wg-adres").fill("8011AB 5");
    await page.getByRole("option").first().click({ timeout: 3000 });
  }).toPass({ timeout: 30000 });
}

async function vulSchutting(scope: Page | ReturnType<Page["locator"]>) {
  await scope.getByLabel(/Aantal Schutting/).fill("20");
  await scope.getByRole("button", { name: /Douglas schutting/ }).click();
}

test.describe("tegels", () => {
  test("kiezen, aanpassen, verwijderen, overzicht en herladen behoudt het tuinplan", async ({ page }, info) => {
    await open(page, info.project.name, { weergave: "tegels" });
    await expect(page.getByRole("heading", { name: "Waar kunnen we je mee helpen?" })).toBeVisible();
    const tegel = page.locator("button[aria-expanded]").filter({ hasText: /^Schutting/ });
    await expect(tegel).toHaveAttribute("aria-expanded", "false");
    await expect(tegel).toContainText(/vanaf\s*€/);
    await tegel.click();
    await expect(tegel).toHaveAttribute("aria-expanded", "true");
    const paneel = info.project.name === "mobiel" ? page.getByRole("dialog") : page.locator("#tegel-paneel");
    await expect(paneel).toBeVisible();
    // Zolang er niets is ingevuld, kan het onderdeel niet worden toegevoegd.
    await expect(paneel.getByRole("button", { name: "Toevoegen aan mijn tuinplan" })).toBeDisabled();
    await vulSchutting(paneel);
    await expect(paneel).toContainText(/Dit onderdeel:\s*€\s*2\.317,15/);
    await paneel.getByRole("button", { name: "Toevoegen aan mijn tuinplan" }).click();
    await expect(paneel).toBeHidden();
    // Focus terug op de tegel, die nu een vinkje en het bedrag toont; de onderbalk telt mee.
    await expect(tegel).toBeFocused();
    await expect(tegel).toContainText(GOUD);
    const balk = page.getByRole("region", { name: "Jouw tuinplan" });
    await expect(balk).toContainText(/1 onderdeel\s*·\s*€\s*2\.317,15/);

    // Herladen: het plan staat er nog.
    await page.reload();
    await rustig(page);
    await expect(page.getByRole("region", { name: "Jouw tuinplan" })).toContainText(/1 onderdeel/);

    await page.getByRole("region", { name: "Jouw tuinplan" }).getByRole("button", { name: "Bekijk en vraag aan" }).click();
    await expect(page.getByRole("heading", { name: "Jouw tuinplan" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Schutting" })).toContainText(GOUD);
    await expect(page.getByText(/Totaal \(incl\. btw\)/i).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)[\s\S]*€\s*2\.317,15/i);

    // Aanpassen en verwijderen.
    await page.getByRole("button", { name: "Schutting verwijderen" }).click();
    await expect(page.locator("button[aria-expanded]").filter({ hasText: /^Schutting/ })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("region", { name: "Jouw tuinplan" })).toHaveCount(0);
  });

  test("Escape sluit het paneel en zet de focus terug; een niet-toegevoegd onderdeel laat niets achter", async ({ page, axe }, info) => {
    await open(page, info.project.name, { weergave: "tegels" });
    const tegel = page.locator("button[aria-expanded]").filter({ hasText: /^Schutting/ });
    await tegel.click();
    const paneel = info.project.name === "mobiel" ? page.getByRole("dialog") : page.locator("#tegel-paneel");
    await paneel.getByLabel(/Aantal Schutting/).fill("12");
    await axe("tegels met open paneel");
    await page.keyboard.press("Escape");
    await expect(paneel).toBeHidden();
    await expect(tegel).toBeFocused();
    await expect(page.getByRole("region", { name: "Jouw tuinplan" })).toHaveCount(0);
    await tegel.click();
    await expect(paneel.getByLabel(/Aantal Schutting/)).toHaveValue("");
    await page.keyboard.press("Escape");
    await axe("tegels");
  });
});

test.describe("stappen", () => {
  test("kies, vul in, overzicht; Volgende is uitgeschakeld tot de stap geldig is", async ({ page, axe }, info) => {
    await open(page, info.project.name, { weergave: "stappen" });
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    const volgende = page.getByRole("button", { name: "Volgende" });
    await expect(volgende).toBeDisabled();
    const schutting = page.locator("button[aria-pressed]").filter({ hasText: /^Schutting/ });
    await schutting.click();
    await expect(schutting).toHaveAttribute("aria-pressed", "true");
    await axe("stappen: kiezen");
    await volgende.click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    await expect(page.getByRole("button", { name: /Bekijk overzicht/ })).toBeDisabled();
    await vulSchutting(page.locator("main"));
    await expect(page.getByText(/Tot nu toe:/)).toContainText(GOUD);
    await axe("stappen: onderdeel");
    await page.getByRole("button", { name: /Bekijk overzicht/ }).click();
    await expect(page.getByRole("heading", { name: "Jouw tuinplan" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)[\s\S]*€\s*2\.317,15/i);
    await axe("stappen: overzicht");
  });
});

test.describe("alles op één pagina", () => {
  test("zonder keuze (bestaande rekentools) is de weergave de lijst en geeft dezelfde prijs", async ({ page, axe }, info) => {
    await open(page, info.project.name, {});
    await expect(page.getByRole("heading", { name: "Stel je project samen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Waar kunnen we je mee helpen?" })).toHaveCount(0);
    await page.getByLabel(/Aantal Schutting/).fill("20");
    await page.locator("select").first().selectOption({ index: 1 });
    await expect(page.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)[\s\S]*€\s*2\.317,15/i);
    await axe("lijst");
  });
});

test.describe("prijs na contactgegevens", () => {
  test("de prijs staat er pas na het versturen van de aanvraag", async ({ page }, info) => {
    await open(page, info.project.name, { weergave: "lijst", prijsNaContact: true });
    await page.getByLabel(/Aantal Schutting/).fill("20");
    await page.locator("select").first().selectOption({ index: 1 });
    await expect(page.getByText(/zie je direct wat het kost/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/TOTAAL \(INCL\. BTW\)/i);
    await expect(page.getByLabel("Naam")).toBeVisible();
  });
});
