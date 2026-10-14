import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, pdokNep, eigenA } from "./fixtures";
import type { Page } from "@playwright/test";

// Twee dingen in de rekentool-editor, op 412 × 915 (mobiele editor, hovenier A1) en 1440 × 900 (desktop, hovenier A2), ingelogd en als gast:
// 1. de weergave van de klant-rekentool is vindbaar en wisselt direct mee;
// 2. de naam van een onderdeel wijzig je op één plek (de kop), een nieuw leeg onderdeel heet "Nieuw onderdeel" en heeft de cursor direct in het naamveld.
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ toolSlot }) => {
  void toolSlot;
});

const DRAFT_SLEUTEL = "kostenplan:draft:v1";
const gastDraft = () => ({
  version: 1,
  id: "e2edraft0000001",
  updatedAt: Date.now(),
  company: { name: "Hovenier Gast", colors: { primair: "#15803d" } },
  tarieven: { tarief: 180, voorrijkosten: 35, transport: 0 },
  calculator: {
    name: "Mijn rekentool",
    werkzaamheden: [
      { id: "w1", actief: true, icoon: "Fence", presetId: "schutting", draft: { naam: "Schutting", methode: "METER", productiviteit: "6", transportPerDag: false, bandbreedte: false, werktempoPerMateriaal: false, materialen: [{ sleutel: "m1", naam: "Douglas", prijs: "85", prijsMin: "85", prijsMax: "85", productiviteitOverride: "", isVoorbeeld: false }], extras: [] } },
    ],
  },
});

const tool = (project: string) => seed()[eigenA(project)].tools.tuinaanleg;
const isMobiel = (project: string) => project === "mobiel";
const naamVeld = (page: Page) => page.getByRole("textbox", { name: "Naam van het onderdeel" });
const naamKnop = (page: Page) => page.getByRole("button", { name: /Naam van het onderdeel wijzigen/ });
const productNaam = (toolId: string, naam: string) => sql(`SELECT count(*) FROM "Product" WHERE "toolId" = '${toolId}' AND naam = '${naam}'`);

// Opent het onderdeel in de editor: mobiel via de lijst (sheet), desktop via het paneel.
async function openOnderdeel(page: Page, project: string, toolId: string, naam: string, id: string) {
  if (isMobiel(project)) {
    await page.goto(`/dashboard/tools/${toolId}`);
    await rustig(page);
    await page.getByRole("button", { name: new RegExp(`^${naam}`) }).first().click();
    await expect(naamKnop(page)).toBeVisible();
  } else {
    await page.goto(`/dashboard/tools/${toolId}?paneel=${encodeURIComponent(`werkzaamheid:${id}`)}`);
    await rustig(page);
    await expect(naamVeld(page)).toBeVisible();
  }
}

test.describe("ingelogd: naam van een onderdeel", () => {
  test.use({ gebruiker: "auto" });

  test("een nieuw leeg onderdeel heet 'Nieuw onderdeel', de cursor staat in het naamveld, typen vervangt de naam en het blijft na herladen", async ({ page }, info) => {
    const project = info.project.name;
    const t = tool(project);
    const naam = isMobiel(project) ? "Vlonder mobiel" : "Vlonder desktop";
    sql(`DELETE FROM "Product" WHERE "toolId" = '${t}' AND naam IN ('Nieuw onderdeel', '${naam}')`);
    await page.goto(`/dashboard/tools/${t}`);
    await rustig(page);
    if (isMobiel(project)) await page.getByRole("button", { name: "Onderdeel", exact: true }).click();
    else await page.goto(`/dashboard/tools/${t}?paneel=toevoegen`);
    await page.getByRole("button", { name: /Iets anders/ }).click();

    // Mobiel: de naam in de kop van de sheet is meteen een veld; desktop: het veld in de kop van het paneel.
    const veld = naamVeld(page);
    await expect(veld).toBeVisible({ timeout: 20000 });
    await expect(veld).toHaveValue("Nieuw onderdeel");
    await expect(veld).toBeFocused();
    expect(await veld.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, "Nieuw onderdeel".length]);
    await page.keyboard.type(naam);
    await page.keyboard.press("Enter");
    await expect.poll(() => productNaam(t, naam), { timeout: 15000 }).toBe("1");
    expect(productNaam(t, "Nieuw onderdeel")).toBe("0");

    await page.reload();
    await rustig(page);
    if (isMobiel(project)) await expect(page.getByRole("button", { name: new RegExp(`^${naam}`) }).first()).toBeVisible();
    else await page.goto(`/dashboard/tools/${t}`);
    sql(`DELETE FROM "Product" WHERE "toolId" = '${t}' AND naam = '${naam}'`);
  });

  test("een bestaand onderdeel hernoemen via de kop; een lege naam wordt niet opgeslagen", async ({ page, axe }, info) => {
    const project = info.project.name;
    const t = tool(project);
    const [id] = sql(`SELECT id FROM "Product" WHERE "toolId" = '${t}' AND naam = 'Schutting'`).split("\n");
    await openOnderdeel(page, project, t, "Schutting", id);
    const veld = naamVeld(page);
    if (isMobiel(project)) await naamKnop(page).click();
    else await veld.click();
    await expect(veld).toBeFocused();
    await axe("onderdeel: naam bewerken");

    // Leeg: melding bij het veld, vorige naam blijft (ook in de database).
    await veld.fill("");
    await expect(page.getByText("Geef dit onderdeel een naam")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByText("Geef dit onderdeel een naam")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(productNaam(t, "Schutting")).toBe("1");
    await expect(isMobiel(project) ? naamKnop(page) : naamVeld(page)).toContainText(isMobiel(project) ? "Schutting" : "");
    if (!isMobiel(project)) await expect(naamVeld(page)).toHaveValue("Schutting");

    // Hernoemen: Enter (mobiel) of tikken buiten het veld.
    if (isMobiel(project)) await naamKnop(page).click();
    await naamVeld(page).fill("Houten schutting");
    if (isMobiel(project)) await page.keyboard.press("Enter");
    else await page.getByRole("heading", { name: "Basis" }).click();
    await expect.poll(() => productNaam(t, "Houten schutting"), { timeout: 15000 }).toBe("1");
    await page.reload();
    await rustig(page);
    if (isMobiel(project)) await expect(page.getByRole("button", { name: /^Houten schutting/ }).first()).toBeVisible();
    else await expect(naamVeld(page)).toHaveValue("Houten schutting");
    sql(`UPDATE "Product" SET naam = 'Schutting' WHERE id = '${id}'`);
  });

  test("een onderdeel uit een preset houdt zijn presetnaam en is ook te hernoemen", async ({ page }, info) => {
    const project = info.project.name;
    const t = tool(project);
    const [id] = sql(`SELECT id FROM "Product" WHERE "toolId" = '${t}' AND naam = 'Graszoden'`).split("\n");
    await openOnderdeel(page, project, t, "Graszoden", id);
    if (isMobiel(project)) await expect(naamKnop(page)).toContainText("Graszoden");
    else await expect(naamVeld(page)).toHaveValue("Graszoden");
    if (isMobiel(project)) await naamKnop(page).click();
    await naamVeld(page).fill("Gazon");
    await page.keyboard.press(isMobiel(project) ? "Enter" : "Tab");
    await expect.poll(() => productNaam(t, "Gazon"), { timeout: 15000 }).toBe("1");
    sql(`UPDATE "Product" SET naam = 'Graszoden' WHERE id = '${id}'`);
  });
});

test.describe("ingelogd: weergave vindbaar en wisselen", () => {
  test.use({ gebruiker: "auto" });

  test("een eigen plek voor de weergave; kiezen wisselt het voorbeeld, de klant-rekentool (/t en embed) volgt", async ({ page, context }, info) => {
    const project = info.project.name;
    const s = seed()[eigenA(project)];
    const t = s.tools.tuinaanleg;
    await pdokNep(context);
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${t}'`);
    await page.goto(`/dashboard/tools/${t}`);
    await rustig(page);
    const voorbeeld = page.frameLocator('iframe[title^="Voorbeeld van"]');
    const adresInVoorbeeld = async () => {
      await expect(async () => {
        if (await voorbeeld.locator("[data-onderdeel]").first().isVisible()) return;
        await voorbeeld.locator("#wg-adres").fill("8011AB 5");
        await voorbeeld.getByRole("option").first().click({ timeout: 3000 });
      }).toPass({ timeout: 30000 });
    };
    const kies = (w: RegExp) => page.getByRole("radiogroup", { name: "Weergave" }).locator("label").filter({ hasText: w }).click();

    if (isMobiel(project)) {
      // Eigen regel onder de onderdelen, met samenvatting; opent het paneel rechtstreeks.
      const rij = page.getByRole("button", { name: /Weergave voor je klant/ });
      await expect(rij).toContainText("Alles op één pagina · in de pagina");
      await rij.click();
      await kies(/^Tegels/);
      await page.getByRole("dialog").getByRole("button", { name: "Sluiten" }).click();
      await expect(page.getByRole("button", { name: /Weergave voor je klant/ })).toContainText("Tegels · in de pagina");
      await page.getByRole("radio", { name: "Voorbeeld" }).check({ force: true }).catch(async () => page.getByText("Voorbeeld", { exact: true }).first().click());
    } else {
      await expect(voorbeeld.getByRole("heading", { name: "Stel je project samen" })).toBeVisible({ timeout: 20000 });
      await page.getByRole("button", { name: "Weergave", exact: true }).click();
      await kies(/^Tegels/);
    }
    await adresInVoorbeeld();
    await expect(voorbeeld.getByRole("heading", { name: "Waar kunnen we je mee helpen?" })).toBeVisible({ timeout: 15000 });
    await expect.poll(() => sql(`SELECT "weergaveConfig"->>'weergave' FROM "Tool" WHERE id = '${t}'`), { timeout: 10000 }).toBe("tegels");

    if (!isMobiel(project)) {
      await kies(/^Stappen/);
      await expect(voorbeeld.getByRole("progressbar")).toBeVisible({ timeout: 15000 });
      await expect.poll(() => sql(`SELECT "weergaveConfig"->>'weergave' FROM "Tool" WHERE id = '${t}'`), { timeout: 10000 }).toBe("stappen");
      await kies(/^Tegels/);
      await expect.poll(() => sql(`SELECT "weergaveConfig"->>'weergave' FROM "Tool" WHERE id = '${t}'`), { timeout: 10000 }).toBe("tegels");
    }

    // De klant-rekentool toont de gekozen weergave: eigen pagina en embed.
    for (const adres of [`/t/${s.bedrijfSlug}/${s.tuinaanlegSlug}`, `/embed/${t}`]) {
      const p = await context.newPage();
      await p.goto(adres);
      await expect(async () => {
        if (await p.locator("[data-onderdeel], button[aria-expanded]:has-text('Schutting')").first().isVisible()) return;
        await p.locator("#wg-adres").fill("8011AB 5");
        await p.getByRole("option").first().click({ timeout: 3000 });
      }).toPass({ timeout: 30000 });
      await expect(p.getByRole("heading", { name: "Waar kunnen we je mee helpen?" }), adres).toBeVisible({ timeout: 15000 });
      await p.close();
    }
  });

  test("bij een nieuwe rekentool één keer een tip die naar het weergave-paneel wijst; weggeklikt komt hij niet terug", async ({ page }, info) => {
    const project = info.project.name;
    const t = tool(project);
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{"weergave":"tegels","tip":true}'::jsonb WHERE id = '${t}'`);
    await page.goto(`/dashboard/tools/${t}`);
    await rustig(page);
    const tip = page.getByRole("note").filter({ hasText: "Kies hoe je klant de rekentool ziet" });
    await expect(tip).toBeVisible();
    await tip.getByRole("button", { name: "Weergave kiezen" }).click();
    await expect(page.getByRole("heading", { name: "Weergave voor je klant" }).first()).toBeVisible();
    await expect.poll(() => sql(`SELECT "weergaveConfig"->>'tip' FROM "Tool" WHERE id = '${t}'`), { timeout: 10000 }).toBe("false");
    await page.goto(`/dashboard/tools/${t}`);
    await rustig(page);
    await expect(page.getByRole("note").filter({ hasText: "Kies hoe je klant de rekentool ziet" })).toHaveCount(0);

    // Wegklikken (zonder het paneel te openen) werkt ook.
    sql(`UPDATE "Tool" SET "weergaveConfig" = '{"weergave":"tegels","tip":true}'::jsonb WHERE id = '${t}'`);
    await page.goto(`/dashboard/tools/${t}`);
    await rustig(page);
    await page.getByRole("button", { name: "Tip sluiten" }).click();
    await expect(tip).toHaveCount(0);
    await expect.poll(() => sql(`SELECT "weergaveConfig"->>'tip' FROM "Tool" WHERE id = '${t}'`), { timeout: 10000 }).toBe("false");
  });
});

test.describe("gast (/probeer/editor)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(([sleutel, draft]) => { if (window.localStorage.getItem(sleutel as string) === null) window.localStorage.setItem(sleutel as string, JSON.stringify(draft)); }, [DRAFT_SLEUTEL, gastDraft()] as const);
  });

  test("onderdeel hernoemen, nieuw onderdeel met cursor in het naamveld en weergave wisselen; alles blijft na herladen", async ({ page }, info) => {
    const mobiel = isMobiel(info.project.name);
    await page.goto("/probeer/editor");
    const voorbeeld = page.frameLocator('iframe[title^="Voorbeeld van"]');
    // De gast begint in "Uitproberen"; op desktop bewerk je het onderdeel door in het voorbeeld erop te klikken.
    const naarBewerken = async () => {
      await page.getByRole(mobiel ? "radio" : "button", { name: "Bewerken", exact: true }).click();
    };
    await expect(page.getByRole(mobiel ? "radio" : "button", { name: mobiel ? "Bewerken" : "Weergave", exact: true })).toBeVisible({ timeout: 20000 });
    if (mobiel) await naarBewerken();
    const draftInBrowser = () => page.evaluate((s) => JSON.parse(window.localStorage.getItem(s) ?? "null"), DRAFT_SLEUTEL);

    // Hernoemen via de kop.
    if (mobiel) await page.getByRole("button", { name: /^Schutting/ }).first().click();
    else {
      await naarBewerken();
      await voorbeeld.getByRole("button", { name: /Schutting aanpassen/ }).click();
      await naamVeld(page).click();
    }
    if (mobiel) await naamKnop(page).click();
    await expect(naamVeld(page)).toBeFocused();
    await naamVeld(page).fill("Tuinschutting");
    await page.keyboard.press(mobiel ? "Enter" : "Tab");
    await expect.poll(async () => (await draftInBrowser())?.calculator.werkzaamheden[0].draft.naam, { timeout: 10000 }).toBe("Tuinschutting");

    // Een nieuw leeg onderdeel: "Nieuw onderdeel", cursor in het veld.
    await page.goto("/probeer/editor");
    if (mobiel) {
      await naarBewerken();
      await page.getByRole("button", { name: "Onderdeel", exact: true }).click();
    } else {
      await naarBewerken();
      await voorbeeld.getByRole("button", { name: /Onderdeel toevoegen/ }).click();
    }
    await page.getByRole("button", { name: /Iets anders/ }).click();
    await expect(naamVeld(page)).toBeVisible({ timeout: 15000 });
    await expect(naamVeld(page)).toHaveValue("Nieuw onderdeel");
    await expect(naamVeld(page)).toBeFocused();
    await page.keyboard.type("Vlonder");
    await page.keyboard.press(mobiel ? "Enter" : "Tab");
    await expect.poll(async () => (await draftInBrowser())?.calculator.werkzaamheden.map((w: { draft: { naam: string } }) => w.draft.naam), { timeout: 10000 }).toEqual(["Tuinschutting", "Vlonder"]);

    // Weergave: vindbaar en wisselen; het voorbeeld volgt direct.
    await page.goto("/probeer/editor");
    if (mobiel) {
      await naarBewerken();
      const rij = page.getByRole("button", { name: /Weergave voor je klant/ });
      await expect(rij).toContainText("Tegels");
      await rij.click();
    } else {
      await page.getByRole("button", { name: "Weergave", exact: true }).click();
    }
    await page.getByRole("radiogroup", { name: "Weergave" }).locator("label").filter({ hasText: /^Stappen/ }).click();
    await expect.poll(async () => (await draftInBrowser())?.weergave?.weergave, { timeout: 10000 }).toBe("stappen");
    if (!mobiel) await expect(voorbeeld.getByRole("progressbar")).toBeVisible({ timeout: 15000 });
    await page.reload();
    await expect.poll(async () => (await draftInBrowser())?.weergave?.weergave).toBe("stappen");
  });
});
