import { test, expect, rustig } from "./fixtures";

// #73: focus lekte uit dialogen en bottom sheets naar de pagina erachter en kwam na sluiten ergens anders terecht.
test.describe("focus in dialogen", () => {
  test.use({ gebruiker: "auto" });

  test("Bedrijf wisselen: focus gaat naar binnen, Tab blijft in de dialoog, Escape zet de focus terug op de opener (#73)", async ({ page }) => {
    await page.goto("/dashboard/profiel");
    await rustig(page);
    const opener = page.getByRole("button", { name: /Bedrijf wisselen/ }).and(page.locator(":visible")).first();
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialoog = page.getByRole("dialog", { name: "Bedrijf wisselen" });
    await expect(dialoog).toBeVisible();
    const binnen = () => page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"));
    expect(await binnen(), "na openen staat de focus in de dialoog").toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await binnen(), `Tab ${i + 1} blijft in de dialoog`).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await binnen(), `Shift+Tab ${i + 1} blijft in de dialoog`).toBe(true);
    }
    // de pagina erachter is inert: niets daarbuiten is focusbaar of aan te klikken
    expect(await page.evaluate(() => document.querySelectorAll("[inert]").length)).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(dialoog).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelectorAll("[inert]").length), "inert is weer weg").toBe(0);
    await expect(opener).toBeFocused();
  });

  test("een sheet boven een drawer: Escape sluit eerst de bovenste en de focus gaat stap voor stap terug (#73)", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await rustig(page);
    // open het eerste lead-kaartje (drawer), daarin "Verloren"/afhandel-dialoog is niet altijd beschikbaar: gebruik de Overlay-opener in de drawer
    const kaart = page.getByRole("button", { name: /Nina Nieuw/ }).and(page.locator(":visible")).first();
    await kaart.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog").first();
    await expect(drawer).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")), `Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(kaart).toBeFocused();
  });
});
