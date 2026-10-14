import { test, expect, seed, rustig, eigenA } from "./fixtures";

// React #418/#419 (hydratiefout door tijdzone-verschillen tussen server en browser) op leads, offertes, facturen, profiel
// en de online offerte: nergens meer een consolefout.
test.describe("geen consolefouten (hydratie)", () => {
  test.use({ gebruiker: "auto" });

  const fouten = (page: import("@playwright/test").Page) => {
    const lijst: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") lijst.push(m.text());
    });
    page.on("pageerror", (e) => lijst.push(e.message));
    return lijst;
  };
  const relevant = (l: string[]) => l.filter((t) => /Hydration|hydrat|#418|#419|Minified React error|did not match/i.test(t));

  test("hovenier-pagina's: leads, offerte, factuur, facturen, profiel", async ({ page }, info) => {
    const a = seed()[eigenA(info.project.name)];
    const lijst = fouten(page);
    for (const pad of [
      "/dashboard/leads",
      `/dashboard/leads/${a.leads["akkoord"]}/offerte`,
      `/dashboard/facturen/${a.facturen["verstuurd"]}`,
      `/dashboard/facturen/${a.facturen["te-laat"]}`,
      "/dashboard/facturen",
      "/dashboard/profiel",
      "/dashboard/profiel/offerte-instellingen",
    ]) {
      await page.goto(pad);
      await rustig(page);
    }
    expect(relevant(lijst), lijst.join("\n")).toEqual([]);
  });

  test("online offerte en factuur (anonieme klant)", async ({ browser, baseURL }, info) => {
    const a = seed()[eigenA(info.project.name)];
    const ctx = await browser.newContext({ baseURL: baseURL ?? undefined });
    const page = await ctx.newPage();
    const lijst = fouten(page);
    await page.goto(`/o/${a.offerteTokens["offerte-verstuurd"]}`);
    await rustig(page);
    await page.goto(`/f/${a.factuurTokens["verstuurd"]}`);
    await rustig(page);
    expect(relevant(lijst), lijst.join("\n")).toEqual([]);
    await ctx.close();
  });

  test("de titel van een ongeldige offertelink is niet 'Jouw offerte'", async ({ page }) => {
    await page.goto("/o/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    await expect(page).toHaveTitle(/niet gevonden/i);
  });
});
