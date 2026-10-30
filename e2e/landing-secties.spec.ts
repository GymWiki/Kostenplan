import { test, expect } from "./fixtures";
import { VRAGEN } from "../app/lib/landing/feiten";

// Landingspagina: slider "Zo werkt het", gecombineerde donkere sectie, jaarbesparing en FAQ-drawers.
const BREEDTES = [360, 390, 430, 768, 1280];

test("volgorde van de secties; geen sectie 'Vertrouwen' meer; ankers uit de navigatie bestaan", async ({ page }) => {
  await page.goto("/");
  const koppen = await page.locator("main h2").allTextContents();
  expect(koppen[0]).toMatch(/avonds nog offertes/i);
  expect(koppen.slice(1, 6)).toEqual([
    "In vier stappen staat je rekentool online",
    "Hij rekent op jouw site. Ook als jij niet werkt.",
    "Wat Kostenplan kost",
    "Vragen van hoveniers",
    "Bouw je rekentool vanavond nog.",
  ]);
  await expect(page.locator("main")).not.toContainText("Waarom hoveniers Kostenplan kunnen vertrouwen");
  for (const id of ["zo-werkt-het", "aanvragen", "prijzen", "vragen"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
  for (const oud of ["huisstijl", "werkzaamheden"]) await expect(page.locator(`section#${oud}`)).toHaveCount(0);
});

test.describe("slider Zo werkt het", () => {
  test("alle vier de stappen staan met hun tekst in de pagina; pijlen, stapknoppen en toetsenbord wisselen van stap", async ({ page }, info) => {
    await page.goto("/");
    const slider = page.getByRole("region", { name: "Zo werkt het, in vier stappen" });
    const slides = slider.locator('[aria-roledescription="slide"]');
    await expect(slides).toHaveCount(4);
    // Alles staat in de DOM, ook de slides buiten beeld.
    const tekst = await slider.textContent();
    for (const t of ["Kies je onderdelen", "Vul je prijzen in", "Maak hem van jou", "Zet hem op je website", "Voorbeelden van rekentools", "Templates", "Rekentool op je eigen website zetten", "Eruit zien als jouw bedrijf"]) expect(tekst).toContain(t);
    const live = slider.locator("[aria-live]");
    await expect(live).toHaveText(/Stap 1 van 4: Kies je onderdelen/);
    await slider.scrollIntoViewIfNeeded();
    if (info.project.name === "desktop") {
      await slider.getByRole("button", { name: "Volgende stap" }).click();
      await expect(live).toHaveText(/Stap 2 van 4/);
      await expect(slider.getByRole("button", { name: "Vorige stap" })).toBeEnabled();
    }
    await slider.getByRole("button", { name: /Zet hem op je website/ }).click();
    await expect(live).toHaveText(/Stap 4 van 4/);
    await expect(slider.getByRole("button", { name: /Zet hem op je website/ })).toHaveAttribute("aria-current", "step");
    // Toetsenbord op de baan zelf.
    await slider.getByLabel("Stappen, gebruik de pijltjestoetsen om te wisselen").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(live).toHaveText(/Stap 3 van 4/);
    await page.keyboard.press("Home");
    await expect(live).toHaveText(/Stap 1 van 4/);
  });

  test("wisselt vanzelf van stap, stopt bij pauzeren en na een eigen keuze", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "tijdsgevoelig: één keer is genoeg");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const slider = page.getByRole("region", { name: "Zo werkt het, in vier stappen" });
    await slider.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    const live = slider.locator("[aria-live]");
    await expect(live).toHaveText(/Stap 1 van 4/);
    await expect(live).toHaveText(/Stap 2 van 4/, { timeout: 12000 });
    await slider.getByRole("button", { name: "Automatisch wisselen pauzeren" }).click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(9000);
    await expect(live).toHaveText(/Stap 2 van 4/);
    await expect(slider.getByRole("button", { name: "Automatisch wisselen starten" })).toBeVisible();
  });

  test("een oude ankerlink (#huisstijl) opent stap 3", async ({ page }) => {
    await page.goto("/#huisstijl");
    await expect(page.locator("[aria-live]").filter({ hasText: "Stap" }).first()).toHaveText(/Stap 3 van 4: Maak hem van jou/);
  });

  test("slides hebben gelijke hoogte en de slider verspringt niet bij wisselen (CLS)", async ({ page }, info) => {
    await page.goto("/");
    const slider = page.getByRole("region", { name: "Zo werkt het, in vier stappen" });
    await slider.scrollIntoViewIfNeeded();
    // De slider moet compact zijn: de hele slider past in beeld, ook met stapknoppen erboven.
    const h = (await slider.boundingBox())!.height;
    expect(h, "hoogte slider").toBeLessThan(info.project.name === "desktop" ? 600 : 1000);
    const hoogtes = await slider.locator('[aria-roledescription="slide"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(new Set(hoogtes).size).toBe(1);
    const voor = (await slider.boundingBox())!.height;
    await slider.getByRole("button", { name: /Maak hem van jou/ }).click();
    await page.waitForTimeout(600);
    expect(Math.abs((await slider.boundingBox())!.height - voor)).toBeLessThan(1);
  });

  test("reduced motion: wisselen werkt zonder vloeiend scrollen", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3200/");
    const slider = page.getByRole("region", { name: "Zo werkt het, in vier stappen" });
    await slider.getByRole("button", { name: /Vul je prijzen in/ }).click();
    await expect(slider.locator("[aria-live]")).toHaveText(/Stap 2 van 4/);
    await ctx.close();
  });
});

for (const b of BREEDTES) {
  test(`${b} px: niets loopt horizontaal uit en de donkere sectie staat tussen lichte secties`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport wordt hier zelf gezet");
    await page.setViewportSize({ width: b, height: 900 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const donker = await page.evaluate(() => {
      const kleur = (el: Element | null) => (el ? getComputedStyle(el.firstElementChild ?? el).backgroundColor : "");
      const sec = document.querySelector("#aanvragen")!;
      return [kleur(sec.previousElementSibling), kleur(sec), kleur(sec.nextElementSibling)];
    });
    expect(donker[0]).not.toBe(donker[1]);
    expect(donker[2]).not.toBe(donker[1]);
  });
}

test("prijzen: bij 'Per jaar' staat de besparing, berekend uit de prijzen", async ({ page }) => {
  await page.goto("/");
  const sectie = page.locator("#prijzen");
  await expect(sectie.getByText(/Bespaar/).first()).toBeHidden();
  await sectie.getByText("Per jaar", { exact: true }).click();
  await expect(sectie.getByText(/Bespaar\s€\s49 per jaar \(14%\)/)).toBeVisible();
  await expect(sectie.getByText(/Bespaar\s€\s129 per jaar \(16%\)/)).toBeVisible();
});

test("vragen: dicht met knoppen, antwoorden in de DOM, toetsenbord en JSON-LD kloppen", async ({ page }) => {
  await page.goto("/");
  const sectie = page.locator("#vragen");
  const knoppen = sectie.getByRole("button");
  await expect(knoppen).toHaveCount(VRAGEN.length);
  for (const v of VRAGEN) expect(await sectie.textContent()).toContain(v.antwoord.slice(0, 40));
  const eerste = knoppen.first();
  await expect(eerste).toHaveAttribute("aria-expanded", "false");
  await expect(sectie.getByText(VRAGEN[0]!.antwoord)).toBeHidden();
  expect((await eerste.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await eerste.focus();
  await page.keyboard.press("Enter");
  await expect(eerste).toHaveAttribute("aria-expanded", "true");
  await expect(sectie.getByText(VRAGEN[0]!.antwoord)).toBeVisible();
  await page.keyboard.press("Space");
  await expect(eerste).toHaveAttribute("aria-expanded", "false");
  const id = await eerste.getAttribute("aria-controls");
  await expect(page.locator(`#${id}`)).toHaveCount(1);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  const faq = ld["@graph"].find((x: { "@type": string }) => x["@type"] === "FAQPage");
  expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(VRAGEN.map((v) => v.vraag));
});
