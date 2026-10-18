import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, pdokNep, eigenA } from "./fixtures";

// Klant-rekentool, tegels op een telefoon: "Toevoegen aan mijn tuinplan" is een ronde knop met een vinkje (FAB) die altijd in beeld
// staat in de sheet van een onderdeel. Op desktop blijft de gewone knop in het paneel.
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ toolSlot }) => {
  void toolSlot;
});

const NAAM = "Toevoegen aan mijn tuinplan";

async function open(page: import("@playwright/test").Page, project: string) {
  const s = seed()[eigenA(project)];
  sql(`UPDATE "Tool" SET "weergaveConfig" = '{"weergave":"tegels"}'::jsonb WHERE id = '${s.tools.tuinaanleg}'`);
  await pdokNep(page.context());
  await page.goto(`/t/${s.bedrijfSlug}/${s.tuinaanlegSlug}`);
  await rustig(page);
  await expect(async () => {
    await page.locator("#wg-adres").fill("8011AB 5");
    await page.getByRole("option").first().click({ timeout: 3000 });
  }).toPass({ timeout: 30000 });
}

for (const breedte of [360, 390, 430]) {
  test(`mobiel ${breedte} px: de vinkjesknop staat altijd in beeld, is ≥ 56 px, valt niet over de inhoud en voegt toe`, async ({ page }, info) => {
    test.skip(info.project.name !== "mobiel", "alleen telefoon");
    await page.setViewportSize({ width: breedte, height: 800 });
    await open(page, info.project.name);
    for (const onderdeel of [/^Schutting/, /^Bestrating/]) {
      const tegel = page.locator("button[aria-expanded]").filter({ hasText: onderdeel });
      await tegel.click();
      const dialoog = page.getByRole("dialog");
      const fab = dialoog.getByRole("button", { name: NAAM });
      await expect(fab).toBeVisible();
      await expect(fab).toBeDisabled(); // nog niets in te vullen
      const vensterHoogte = await page.evaluate(() => window.innerHeight);
      const doos = (await fab.boundingBox())!;
      expect(doos.width, "breedte").toBeGreaterThanOrEqual(56);
      expect(doos.height, "hoogte").toBeGreaterThanOrEqual(56);
      expect(doos.x + doos.width, "rechts binnen het scherm").toBeLessThanOrEqual(breedte - 8);
      expect(doos.y + doos.height, "onderin met marge").toBeLessThanOrEqual(vensterHoogte - 8);
      expect(doos.y, "zichtbaar zonder scrollen").toBeGreaterThan(vensterHoogte / 2);
      await expect(dialoog.getByRole("button", { name: "Verwijderen" })).toHaveCount(0);

      // Onderaan scrollen: de laatste inhoud blijft boven de knop.
      const scroll = dialoog.locator("div.overflow-y-auto").first();
      await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
      const laatste = scroll.locator("div.pb-28 > :last-child");
      const laatsteDoos = (await laatste.boundingBox())!;
      expect(laatsteDoos.y + laatsteDoos.height, "laatste inhoud boven de knop").toBeLessThanOrEqual(doos.y);
      // De knop blijft op zijn plek tijdens het scrollen (staat buiten het scrollende deel).
      expect((await fab.boundingBox())!.y).toBe(doos.y);

      if (onderdeel.source.includes("Schutting")) {
        await dialoog.getByLabel(/Aantal Schutting/).fill("20");
        await dialoog.getByRole("button", { name: /Douglas schutting/ }).click();
        await expect(fab).toBeEnabled();
        await fab.click();
        await expect(dialoog).toBeHidden();
        await expect(tegel).toContainText(/2\.317,15/);
      } else {
        await page.keyboard.press("Escape");
        await expect(dialoog).toBeHidden();
      }
    }
  });
}

test("desktop: geen ronde knop, de gewone knop staat in het paneel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "alleen desktop");
  await open(page, info.project.name);
  await page.locator("button[aria-expanded]").filter({ hasText: /^Schutting/ }).click();
  const paneel = page.locator("#tegel-paneel");
  const knop = paneel.getByRole("button", { name: NAAM });
  await expect(knop).toBeVisible();
  expect((await knop.boundingBox())!.width).toBeGreaterThan(100); // tekstknop, geen cirkel
});
