import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, eigenA } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

// Offerte-instellingen: variabelen in het bericht als gekleurde, versleepbare blokjes (412 × 915 mobiel = A1, 1440 × 900 desktop = A2).
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

test.describe.configure({ mode: "serial" });
test.use({ gebruiker: "auto" });

const ALLE_TOKENS = "Geachte {naam},\nofferte {nummer} voor {onderwerp}: {totaal}\ngeldig tot {geldigTot}\n{link}\nMet groet,\n{contactNaam} {handelsnaam}\nOud: {oudeNaam} Niet hier: {vervaldatum}";

let companyId = "";
let origineel = "";
test.beforeEach(async ({}, info) => {
  companyId = seed()[eigenA(info.project.name)].company1;
  origineel = sql(`SELECT coalesce("deelTekst", '<<leeg>>') FROM "OfferteGegevens" WHERE "companyId"='${companyId}'`);
});
test.afterEach(() => {
  sql(`UPDATE "OfferteGegevens" SET "deelTekst" = ${origineel === "<<leeg>>" ? "NULL" : `'${origineel.replace(/'/g, "''")}'`} WHERE "companyId"='${companyId}'`);
});

const zetTekst = (t: string) => sql(`UPDATE "OfferteGegevens" SET "deelTekst" = '${t.replace(/'/g, "''")}' WHERE "companyId"='${companyId}'`);
const dbTekst = () => sql(`SELECT coalesce("deelTekst", '') FROM "OfferteGegevens" WHERE "companyId"='${companyId}'`);
const editor = (page: Page) => page.getByRole("textbox", { name: "Bericht bij een nieuwe offerte" });
const palet = (page: Page, label: string) => page.getByRole("button", { name: `${label} invoegen` }).first();

async function open(page: Page) {
  await page.goto("/dashboard/profiel/offerte-instellingen");
  await rustig(page);
  await expect(editor(page)).toBeVisible();
}

// Schermpositie van een tekstfragment in de editor (begin of einde ervan).
async function positie(ed: Locator, fragment: string, aan: "voor" | "na"): Promise<{ x: number; y: number }> {
  return ed.evaluate(
    (el, [f, a]) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const i = (n.textContent ?? "").indexOf(f as string);
        if (i < 0) continue;
        const r = document.createRange();
        const o = a === "voor" ? i : i + (f as string).length;
        r.setStart(n, o);
        r.setEnd(n, Math.min(o + 1, n.textContent!.length));
        const b = r.getBoundingClientRect();
        const x = a === "voor" ? b.left : b.right - (b.width || 0) + (a === "na" ? 0 : 0);
        return { x: a === "voor" ? b.left + 1 : x, y: b.top + b.height / 2 };
      }
      throw new Error(`fragment niet gevonden: ${f}`);
    },
    [fragment, aan] as const
  );
}

// `naarFn` wordt pas na het scrollen berekend: schermpositie verandert met scrollen.
async function sleep(page: Page, van: Locator, naarFn: () => Promise<{ x: number; y: number }>) {
  await van.scrollIntoViewIfNeeded();
  const naar = await naarFn();
  const b = (await van.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 5, b.y + b.height / 2 + 5, { steps: 3 });
  await page.mouse.move(naar.x, naar.y, { steps: 12 });
  await page.mouse.up();
}

test("een bestaand sjabloon met alle tokens toont blokjes en wordt exact dezelfde tekst; onbekende blokjes blijven staan", async ({ page }) => {
  zetTekst(ALLE_TOKENS);
  await open(page);
  const ed = editor(page);
  await expect(ed.locator("[data-var]")).toHaveCount(10);
  for (const label of ["Naam klant", "Nummer", "Onderwerp", "Totaalbedrag", "Geldig tot", "Link naar de offerte of factuur", "Jouw naam", "Bedrijfsnaam"]) {
    await expect(ed.getByRole("group", { name: `Variabele ${label}` })).toHaveCount(1);
  }
  // Verouderd of hier niet beschikbaar: neutrale blokjes met een waarschuwing, niets wordt verwijderd.
  await expect(ed.getByRole("group", { name: "Onbekende variabele oudeNaam" })).toBeVisible();
  await expect(ed.getByRole("group", { name: "Onbekende variabele vervaldatum" })).toBeVisible();
  await expect(page.locator("[data-bericht-waarschuwingen]").first()).toContainText("{oudeNaam}");
  // Elke variabele heeft een eigen groepkleur: de blokjes van een groep delen hem, groepen verschillen.
  const kleuren = await ed.locator("[data-var]").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.var, getComputedStyle(e).backgroundColor]));
  const kleurVan = (k: string) => kleuren.find((x) => x[0] === k)![1];
  expect(kleurVan("naam")).not.toBe(kleurVan("totaal"));
  expect(kleurVan("totaal")).toBe(kleurVan("geldigTot"));
  expect(kleurVan("handelsnaam")).toBe(kleurVan("contactNaam"));
  // Typen verandert alleen wat je typt: de rest van de tekst (met alle tokens) komt er exact zo uit.
  await ed.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Tot ziens");
  await expect.poll(dbTekst, { timeout: 10000 }).toBe(`${ALLE_TOKENS} Tot ziens`);
  // Live voorbeeld met voorbeeldwaarden; onbekende blijft leeg, geen "undefined".
  const voorbeeld = page.locator("[data-bericht-voorbeeld]").first();
  await expect(voorbeeld).toContainText("Geachte Jan de Vries,");
  await expect(voorbeeld).toContainText("€ 4.537,97");
  await expect(voorbeeld).toContainText("15 november 2026");
  await expect(voorbeeld).not.toContainText(/undefined|\{/);
});

test("tik op een blokje voegt het in op de cursor; hetzelfde blokje mag vaker; verwijderen met × en met Backspace", async ({ page }) => {
  zetTekst("Hallo wereld");
  await open(page);
  const ed = editor(page);
  await ed.click();
  await page.keyboard.press("Control+End");
  await palet(page, "Naam klant").click();
  await palet(page, "Naam klant").click();
  await expect(ed.locator('[data-var="naam"]')).toHaveCount(2);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("Hallo wereld{naam}{naam}");
  // Verwijderknop (×) van het eerste blokje.
  await ed.getByRole("button", { name: "Verwijder blokje Naam klant" }).first().click();
  await expect(ed.locator('[data-var="naam"]')).toHaveCount(1);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("Hallo wereld{naam}");
  // Backspace direct achter het blokje: het hele blokje weg, de cursor kan er niet midden in staan.
  await ed.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Backspace");
  await expect(ed.locator("[data-var]")).toHaveCount(0);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("Hallo wereld");
});

test("toetsenbord: een blokje is focusbaar en voegt in met Enter en Spatie", async ({ page }) => {
  zetTekst("A");
  await open(page);
  const ed = editor(page);
  await ed.click();
  await page.keyboard.press("Control+End");
  const knop = palet(page, "Nummer");
  await knop.focus();
  await page.keyboard.press("Enter");
  await knop.focus();
  await page.keyboard.press("Space");
  await expect(ed.locator('[data-var="nummer"]')).toHaveCount(2);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("A{nummer}{nummer}");
});

test("slepen: naar het begin, het midden en het eind; verplaatsen naar een andere plek", async ({ page }, info) => {
  test.skip(info.project.name === "mobiel", "slepen met de muis: desktop (op een telefoon is tikken het alternatief)");
  zetTekst("Eerste regel\nMidden hier\nLaatste regel");
  await open(page);
  const ed = editor(page);
  await sleep(page, palet(page, "Naam klant"), () => positie(ed, "Eerste", "voor"));
  await expect(page.locator("[data-drop-indicator]")).toHaveCount(0);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("{naam}Eerste regel\nMidden hier\nLaatste regel");
  await sleep(page, palet(page, "Totaalbedrag"), () => positie(ed, "hier", "voor"));
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("{naam}Eerste regel\nMidden {totaal}hier\nLaatste regel");
  await sleep(page, palet(page, "Link naar de offerte of factuur"), () => positie(ed, "Laatste regel", "na").then((p) => ({ x: p.x + 60, y: p.y })));
  await expect.poll(dbTekst, { timeout: 10000 }).toMatch(/Laatste regel\{link\}$|Laatste regel\n?\{link\}$/);
  // Een blokje in de tekst naar het begin slepen.
  await sleep(page, ed.locator('[data-var="totaal"]'), () => positie(ed, "Eerste", "voor"));
  await expect.poll(dbTekst, { timeout: 10000 }).toMatch(/^\{naam\}\{totaal\}Eerste regel\nMidden hier\nLaatste regel\{link\}$/);
  await expect(ed.locator("[data-var]")).toHaveCount(3);
});

test("slepen toont een drop-indicator op de plek waar het blokje komt", async ({ page }, info) => {
  test.skip(info.project.name === "mobiel", "slepen met de muis: desktop");
  zetTekst("Eerste regel hier");
  await open(page);
  const ed = editor(page);
  const van = palet(page, "Naam klant");
  await van.scrollIntoViewIfNeeded();
  const b = (await van.boundingBox())!;
  const doel = await positie(ed, "regel", "voor");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 5, b.y + b.height / 2 + 5, { steps: 3 });
  await page.mouse.move(doel.x, doel.y, { steps: 12 });
  await expect(page.locator("[data-drop-indicator]")).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator("[data-drop-indicator]")).toHaveCount(0);
});

test("kopiëren en plakken: blokjes blijven blokjes, geen opmaak of rommel uit andere programma's", async ({ page, context }) => {
  zetTekst("Hoi {naam} en {totaal}");
  await open(page);
  const ed = editor(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  // Plakken van platte tekst met een {aanduiding} en opmaak (HTML) die genegeerd moet worden.
  await ed.click();
  await page.keyboard.press("Control+End");
  await ed.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", " groet {contactNaam}\r\nregel twee");
    dt.setData("text/html", "<b style='color:red;font-size:40px'>OPGEMAAKT</b>");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(ed.locator('[data-var="contactNaam"]')).toHaveCount(1);
  await expect(ed.locator("b, font, [style*='font-size']")).toHaveCount(0);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("Hoi {naam} en {totaal} groet {contactNaam}\nregel twee");
  // Alles kopiëren en weer plakken geeft de tekst met blokjes terug (de opgeslagen vorm met {key}).
  const gekopieerd = await ed.evaluate((el) => {
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
    const dt = new DataTransfer();
    el.dispatchEvent(new ClipboardEvent("copy", { clipboardData: dt, bubbles: true, cancelable: true }));
    return dt.getData("text/plain");
  });
  expect(gekopieerd).toBe("Hoi {naam} en {totaal} groet {contactNaam}\nregel twee");
});

test("een {aanduiding} die je zelf typt wordt een blokje; speciale tekens in de tekst blijven gewone tekst in het voorbeeld", async ({ page }) => {
  zetTekst("Start ");
  await open(page);
  const ed = editor(page);
  await ed.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("A & B <b>vet</b> {naam}");
  await page.locator("h1, body").first().click({ position: { x: 1, y: 1 } });
  await expect(ed.locator('[data-var="naam"]')).toHaveCount(1);
  await expect(page.locator("[data-bericht-voorbeeld]").first()).toContainText("A & B <b>vet</b> Jan de Vries");
  await expect(page.locator("[data-bericht-voorbeeld] b")).toHaveCount(0);
  await expect.poll(dbTekst, { timeout: 10000 }).toBe("Start A & B <b>vet</b> {naam}");
});

for (const breedte of [360, 390, 430]) {
  test(`mobiel ${breedte} px: alles past, blokjes zijn ≥ 44 px hoog, tikken voegt in`, async ({ page }, info) => {
    test.skip(info.project.name !== "mobiel", "alleen telefoon");
    await page.setViewportSize({ width: breedte, height: 800 });
    zetTekst("Hoi {naam}");
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), "horizontaal scrollen").toBe(false);
    const knop = palet(page, "Totaalbedrag");
    await knop.scrollIntoViewIfNeeded();
    expect((await knop.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const ed = editor(page);
    await ed.click();
    await page.keyboard.press("Control+End");
    await knop.tap();
    await expect(ed.locator('[data-var="totaal"]')).toHaveCount(1);
    const b = (await ed.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(breedte);
  });
}

test("factuurbericht: waarschuwing als de link ontbreekt; afwijzingsmail kent alleen naam en bedrijf", async ({ page }) => {
  await open(page);
  const factuur = page.getByRole("textbox", { name: "Bericht bij het versturen van een factuur" });
  await factuur.scrollIntoViewIfNeeded();
  const blokjes = factuur.locator("xpath=ancestor::div[contains(@class,'flex-col')][1]");
  await expect(blokjes.getByRole("button", { name: "Vervaldatum invoegen" })).toBeVisible();
  await expect(blokjes.getByRole("button", { name: "IBAN invoegen" })).toBeVisible();
  await expect(blokjes.getByRole("button", { name: "Geldig tot invoegen" })).toHaveCount(0);
  const huidig = sql(`SELECT coalesce("factuurDeelTekst", '') FROM "OfferteGegevens" WHERE "companyId"='${companyId}'`);
  try {
    await factuur.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Zonder link");
    await expect(blokjes.getByText(/kan je klant de factuur niet bekijken/)).toBeVisible();
  } finally {
    sql(`UPDATE "OfferteGegevens" SET "factuurDeelTekst" = ${huidig ? `'${huidig.replace(/'/g, "''")}'` : "NULL"} WHERE "companyId"='${companyId}'`);
  }
});
