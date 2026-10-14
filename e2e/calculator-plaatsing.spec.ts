import { test, expect, seed, eigenA, pdokNep } from "./fixtures";
import type { Page } from "@playwright/test";

// Plaatsing van de klant-rekentool op de site van de hovenier: in de pagina of als knop met pop-up, met een selectie onderdelen en een deep link.
// De testpagina (/test-embed) heeft opzettelijk agressieve CSS.
test.describe.configure({ mode: "serial" });

const s = (project: string) => seed()[eigenA(project)];
// Volgorde van de presets in de seed: bestrating, schutting, graszoden, kunstgras, boom-planten, haag-beplanting.
const SCHUTTING = (project: string) => s(project).products[1];

function url(project: string, extra: Record<string, string>) {
  const q = new URLSearchParams({ tool: s(project).tools.tuinaanleg, modus: "script", ...extra });
  return `/test-embed?${q.toString()}`;
}

async function adresInvullen(frame: ReturnType<Page["frameLocator"]>) {
  await expect(async () => {
    // Al bevestigd (bij een deep link opent het onderdeel zodra het adres klaar is): niets meer te doen.
    if (await frame.getByLabel(/Aantal Schutting/).or(frame.getByRole("heading", { name: "Waar kunnen we je mee helpen?" })).first().isVisible()) return;
    await frame.locator("#wg-adres").fill("8011AB 5");
    await frame.getByRole("option").first().click({ timeout: 3000 });
  }).toPass({ timeout: 30000 });
}

test.describe("knop met pop-up", () => {
  test("opent als venster, sluit met Escape / sluitknop / terug-gebaar; de pagina verschuift niet", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.goto(url(info.project.name, { plaatsing: "popup", weergave: "tegels", knop: "Bereken je prijs", positie: "inline" }));
    const knop = page.getByRole("button", { name: "Bereken je prijs" });
    await expect(knop).toBeVisible();
    // Zolang de pop-up niet open is, laadt er niets.
    await expect(page.locator("iframe")).toHaveCount(0);
    const voor = await page.evaluate(() => ({ breedte: document.documentElement.scrollWidth, hoogte: document.documentElement.scrollHeight, y: document.querySelector("p")!.getBoundingClientRect().top }));

    await knop.click();
    const dialoog = page.getByRole("dialog", { name: /Rekentool/ });
    await expect(dialoog).toBeVisible();
    await expect(knop).toHaveAttribute("aria-expanded", "true");
    const frame = page.frameLocator("iframe").first();
    await expect(frame.getByRole("heading", { name: "Stel je project samen" })).toBeVisible({ timeout: 20000 });
    // Pagina erachter: geblokkeerd en niet bedienbaar; geen verspringing.
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    expect(await page.evaluate(() => [...document.body.children].some((k) => k.hasAttribute("inert")))).toBe(true);
    const tijdens = await page.evaluate(() => ({ breedte: document.documentElement.scrollWidth, y: document.querySelector("p")!.getBoundingClientRect().top }));
    expect(tijdens.breedte).toBe(voor.breedte);
    expect(Math.abs(tijdens.y - voor.y)).toBeLessThan(1);
    // Mobiel: schermvullend; desktop: venster van hooguit 720 px.
    const breedte = (await dialoog.boundingBox())!.width;
    if (info.project.name === "mobiel") expect(breedte).toBeGreaterThanOrEqual(405);
    else expect(breedte).toBeLessThanOrEqual(720);

    // Escape sluit; de focus gaat terug naar de knop.
    await page.keyboard.press("Escape");
    await expect(dialoog).toBeHidden();
    await expect(knop).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(await page.evaluate(() => [...document.body.children].some((k) => k.hasAttribute("inert")))).toBe(false);
    const na = await page.evaluate(() => ({ breedte: document.documentElement.scrollWidth, hoogte: document.documentElement.scrollHeight, y: document.querySelector("p")!.getBoundingClientRect().top }));
    expect(na).toEqual(voor);

    // Sluitknop.
    await knop.click();
    await expect(dialoog).toBeVisible();
    await dialoog.getByRole("button", { name: "Sluiten" }).click();
    await expect(dialoog).toBeHidden();

    // Terug-gebaar (Android): sluit de pop-up en laat de pagina staan.
    const adres = page.url();
    await knop.click();
    await expect(dialoog).toBeVisible();
    await page.goBack();
    await expect(dialoog).toBeHidden();
    expect(page.url()).toBe(adres);
  });

  test("de pagina van de hovenier verschuift niet bij openen en sluiten (CLS 0)", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((lijst) => {
        for (const e of lijst.getEntries()) (window as unknown as { __cls: number }).__cls += (e as unknown as { value: number }).value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(url(info.project.name, { plaatsing: "popup", weergave: "tegels", positie: "rechtsonder" }));
    const knop = page.getByRole("button", { name: "Bereken je prijs" });
    await expect(knop).toBeVisible();
    await page.waitForTimeout(500);
    await page.evaluate(() => ((window as unknown as { __cls: number }).__cls = 0));
    await knop.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.frameLocator("iframe").first().getByRole("heading", { name: "Stel je project samen" })).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });

  test("Escape binnen de rekentool sluit de pop-up ook", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.goto(url(info.project.name, { plaatsing: "popup", positie: "inline" }));
    await page.getByRole("button", { name: "Bereken je prijs" }).click();
    const frame = page.frameLocator("iframe").first();
    await expect(frame.getByRole("heading", { name: "Stel je project samen" })).toBeVisible({ timeout: 20000 });
    // De rekentool in de iframe is pas bedienbaar na de hydratatie: opnieuw proberen tot Escape is aangekomen.
    await expect(async () => {
      await frame.locator("#wg-adres").focus({ timeout: 1000 });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 1500 });
    }).toPass({ timeout: 20000 });
  });
});

test.describe("één onderdeel en deep link", () => {
  test("met één onderdeel staat de configurator er meteen, zonder raster of eerste stap", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.goto(url(info.project.name, { weergave: "stappen", onderdelen: SCHUTTING(info.project.name) }));
    const frame = page.frameLocator("iframe").first();
    await adresInvullen(frame);
    await expect(frame.getByLabel(/Aantal Schutting/)).toBeVisible();
    await expect(frame.getByRole("heading", { name: "Waar kunnen we je mee helpen?" })).toHaveCount(0);
    await expect(frame.getByRole("progressbar")).toHaveCount(0);
    await expect(frame.getByText("Bestrating / terras")).toHaveCount(0);
  });

  test("een deep link (?kp=schutting) opent dat onderdeel direct", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.goto(`${url(info.project.name, { weergave: "tegels" })}&kp=schutting`);
    const frame = page.frameLocator("iframe").first();
    await adresInvullen(frame);
    await expect(frame.getByLabel(/Aantal Schutting/)).toBeVisible({ timeout: 15000 });
    await expect(frame.locator("button[aria-expanded='true']")).toContainText("Schutting");
  });

  test("een deep link in een pop-up opent de pop-up op dat onderdeel", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.goto(`${url(info.project.name, { weergave: "tegels", plaatsing: "popup", positie: "inline" })}#schutting`);
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
    const frame = page.frameLocator("iframe").first();
    await adresInvullen(frame);
    await expect(frame.getByLabel(/Aantal Schutting/)).toBeVisible({ timeout: 15000 });
  });
});

test.describe("iframe-code (zonder laadscript)", () => {
  test("de weergave en selectie komen mee in het adres van de iframe", async ({ page }, info) => {
    await pdokNep(page.context());
    await page.goto(url(info.project.name, { modus: "iframe", weergave: "tegels", onderdelen: SCHUTTING(info.project.name) }));
    const frame = page.frameLocator("iframe").first();
    await adresInvullen(frame);
    await expect(frame.getByLabel(/Aantal Schutting/)).toBeVisible({ timeout: 15000 });
    await expect(page.locator("iframe").first()).toHaveAttribute("src", /weergave=tegels&onderdelen=/);
  });
});
