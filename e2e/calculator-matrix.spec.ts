import { execFileSync } from "node:child_process";
import { test, expect, seed, eigenA, pdokNep } from "./fixtures";
import type { Page } from "@playwright/test";

// Elke weergave × plaatsing, op 390 × 844 (mobiel) en 1440 × 900 (desktop): een onderdeel kiezen, aanpassen, verwijderen, opnieuw
// kiezen, herladen (het tuinplan blijft) en een aanvraag versturen. In de pop-up gebeurt alles in het venster.
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();
// Deze tests wijzigen de weergave van de rekentool of hangen ervan af: één tegelijk per hovenier (zie toolSlot in fixtures.ts).
test.beforeEach(async ({ toolSlot }) => {
  void toolSlot;
});

test.describe.configure({ mode: "serial" });

const GOUD = /2\.317,15/;
type Frame = ReturnType<Page["frameLocator"]>;

async function start(page: Page, project: string, weergave: "tegels" | "stappen" | "lijst", plaatsing: "inline" | "popup") {
  await page.setViewportSize(project === "mobiel" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  const s = seed()[eigenA(project)];
  sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${s.tools.tuinaanleg}'`);
  await pdokNep(page.context());
  const q = new URLSearchParams({ tool: s.tools.tuinaanleg, modus: "script", weergave, ...(plaatsing === "popup" ? { plaatsing: "popup", positie: "inline" } : {}) });
  await page.goto(`/test-embed?${q}`);
  return openFrame(page, plaatsing);
}

async function openFrame(page: Page, plaatsing: "inline" | "popup"): Promise<Frame> {
  if (plaatsing === "popup") await page.getByRole("button", { name: "Bereken je prijs" }).click();
  const f = page.frameLocator("iframe").first();
  await expect(f.getByRole("heading", { name: "Stel je project samen" })).toBeVisible({ timeout: 25000 });
  await adres(f);
  return f;
}

async function adres(f: Frame) {
  await expect(async () => {
    if (await f.locator("#wg-adres").isHidden().catch(() => true)) return;
    if (await f.locator("[data-onderdeel], button[aria-expanded]:has-text('Schutting'), button[aria-pressed]:has-text('Schutting')").first().isVisible()) return;
    await f.locator("#wg-adres").fill("8011AB 5");
    await f.getByRole("option").first().click({ timeout: 3000 });
  }).toPass({ timeout: 30000 });
}

const tegel = (f: Frame) => f.locator("button[aria-expanded]").filter({ hasText: /^Schutting/ });
const paneel = (f: Frame, mobiel: boolean) => (mobiel ? f.getByRole("dialog") : f.locator("#tegel-paneel"));

// Kies de schutting met een hoeveelheid, in de weergave waarin we zitten.
async function kiesSchutting(f: Frame, weergave: string, mobiel: boolean, meter: string) {
  if (weergave === "lijst") {
    await f.getByLabel(/Aantal Schutting/).fill(meter);
    await f.locator("select").first().selectOption({ index: 1 });
  } else if (weergave === "tegels") {
    await tegel(f).click();
    const p = paneel(f, mobiel);
    await p.getByLabel(/Aantal Schutting/).fill(meter);
    await p.getByRole("button", { name: /Douglas schutting/ }).click();
    await p.getByRole("button", { name: "Toevoegen aan mijn tuinplan" }).click();
  } else {
    await f.locator("button[aria-pressed]").filter({ hasText: /^Schutting/ }).click();
    await f.getByRole("button", { name: "Volgende" }).click();
    await f.getByLabel(/Aantal Schutting/).fill(meter);
    await f.getByRole("button", { name: /Douglas schutting/ }).click();
    await f.getByRole("button", { name: /Bekijk overzicht/ }).click();
  }
}

async function naarOverzicht(f: Frame, weergave: string) {
  if (weergave === "tegels") await f.getByRole("region", { name: "Jouw tuinplan" }).getByRole("button", { name: "Bekijk en vraag aan" }).click();
  await expect(f.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)/i);
}

for (const plaatsing of ["inline", "popup"] as const) {
  for (const weergave of ["tegels", "stappen", "lijst"] as const) {
    test(`${weergave} · ${plaatsing}: kiezen, aanpassen, verwijderen, herladen en aanvraag versturen`, async ({ page, axe }, info) => {
      test.setTimeout(180_000);
      const mobiel = info.project.name === "mobiel";
      const toolId = seed()[eigenA(info.project.name)].tools.tuinaanleg;
      sql(`DELETE FROM "Lead" WHERE "toolId" = '${toolId}' AND email = 'matrix@example.com'`);
      let f = await start(page, info.project.name, weergave, plaatsing);

      // Kiezen: het gouden voorbeeld.
      await kiesSchutting(f, weergave, mobiel, "20");
      if (weergave !== "lijst") await naarOverzicht(f, weergave);
      await expect(f.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)[\s\S]*€\s*2\.317,15/i);
      await axe(`${weergave} · ${plaatsing}: overzicht`);

      // Aanpassen.
      if (weergave === "lijst") await f.getByLabel(/Aantal Schutting/).fill("25");
      else {
        await f.getByRole("button", { name: "Schutting aanpassen" }).click();
        if (weergave === "tegels") {
          const p = paneel(f, mobiel);
          await p.getByLabel(/Aantal Schutting/).fill("25");
          await p.getByRole("button", { name: "Klaar" }).click();
          await naarOverzicht(f, weergave);
        } else {
          await f.getByLabel(/Aantal Schutting/).fill("25");
          await f.getByRole("button", { name: /Bekijk overzicht/ }).click();
        }
      }
      await expect(f.locator("body")).not.toContainText(GOUD);
      await expect(f.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)/i);

      // Verwijderen.
      if (weergave === "lijst") await f.getByLabel(/Aantal Schutting/).fill("0");
      else await f.getByRole("button", { name: "Schutting verwijderen" }).click();
      await expect(f.locator("body")).not.toContainText(/TOTAAL \(INCL\. BTW\)/i);

      // Opnieuw kiezen, dan herladen: het tuinplan blijft.
      await kiesSchutting(f, weergave, mobiel, "20");
      await page.reload();
      f = await openFrame(page, plaatsing);
      if (weergave === "lijst") await expect(f.getByLabel(/Aantal Schutting/)).toHaveValue("20", { timeout: 15000 });
      else if (weergave === "tegels") await expect(f.getByRole("region", { name: "Jouw tuinplan" })).toContainText(/1 onderdeel/, { timeout: 15000 });
      else await expect(f.locator("button[aria-pressed='true']").filter({ hasText: /^Schutting/ })).toBeVisible({ timeout: 15000 });
      if (weergave === "stappen") {
        await f.getByRole("button", { name: "Volgende" }).click();
        await f.getByRole("button", { name: /Bekijk overzicht/ }).click();
      } else if (weergave === "tegels") await naarOverzicht(f, weergave);
      await expect(f.locator("body")).toContainText(/TOTAAL \(INCL\. BTW\)[\s\S]*€\s*2\.317,15/i);

      // Aanvraag versturen.
      await f.getByRole("button", { name: /Offerte aanvragen/ }).click();
      await f.locator("#lead-naam").fill("Matrix Test");
      await f.locator("#lead-email").fill("matrix@example.com");
      await f.getByRole("button", { name: "Versturen" }).click();
      await expect(f.getByText(/Bedankt voor (je|uw) aanvraag/)).toBeVisible({ timeout: 20000 });
      expect(sql(`SELECT count(*) FROM "Lead" WHERE "toolId" = '${toolId}' AND email = 'matrix@example.com'`)).toBe("1");
      // Dezelfde keuzes geven in elke weergave hetzelfde bedrag in de opgeslagen aanvraag.
      expect(sql(`SELECT "totaalIndicatie" FROM "Lead" WHERE "toolId" = '${toolId}' AND email = 'matrix@example.com'`)).toBe("2317.15");
      sql(`DELETE FROM "Lead" WHERE "toolId" = '${toolId}' AND email = 'matrix@example.com'`);
    });
  }
}
