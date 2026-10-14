import { test, expect } from "./fixtures";

// Tikdoelen op de inlogpagina zijn minstens 44 px hoog (mobiel).
test("login: knoppen en links zijn minstens 44 px hoog (mobiel)", async ({ page }, info) => {
  test.skip(info.project.name !== "mobiel", "tikdoelen zijn een mobiel-eis");
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  const klein = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main a, main button, form a, form button, form input")]
      .filter((el) => el.getClientRects().length > 0 && !el.closest("[data-skip-tikdoel]"))
      .map((el) => ({ tekst: (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40), h: Math.round(el.getBoundingClientRect().height) }))
      .filter((x) => x.h < 44)
  );
  expect(klein, `te kleine tikdoelen: ${JSON.stringify(klein)}`).toEqual([]);
});
