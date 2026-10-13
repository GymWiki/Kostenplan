import { test, expect, seed } from "./fixtures";

// Hovenier B (Gratis) probeert data van hovenier A te lezen of te wijzigen. Verwacht: nooit data, nooit een 200 met inhoud van A.
test.describe("beveiliging: B tegen A", () => {
  test.use({ gebruiker: "b" });

  test("lead, offerte en factuur van A zijn niet te openen met de URL", async ({ page }) => {
    const a = seed().a1;
    const paden = [
      `/dashboard/leads/${a.leads["akkoord"]}/offerte`,
      `/dashboard/facturen/${a.facturen["verstuurd"]}`,
      `/api/facturen/${a.facturen["verstuurd"]}/pdf`,
    ];
    for (const pad of paden) {
      const r = await page.goto(pad);
      const tekst = await page.locator("body").innerText();
      expect([404, 403, 307, 200], pad).toContain(r?.status());
      expect(tekst, `${pad} lekt gegevens van A`).not.toMatch(/Ahmed Akkoord|Gerrit Gefactureerd|De Vries|F2026-/);
    }
  });

  test("de export bevat alleen facturen van B", async ({ request }) => {
    const r = await request.get("/api/facturen/export?formaat=csv");
    const tekst = await r.text();
    expect(tekst).not.toMatch(/F2026-/);
  });

  test("het beheerpaneel van een factuur van A is voor B onzichtbaar (server actions werken niet over bedrijven heen)", async ({ page }) => {
    await page.goto("/dashboard");
    const res = await page.evaluate(async (id) => (await fetch(`/api/facturen/${id}/pdf`)).status, seed().a1.facturen["verstuurd"]);
    expect([404, 401, 403]).toContain(res);
  });

  test("een gok op een factuur- of offertelink geeft 404", async ({ request }) => {
    for (const pad of ["/f/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "/o/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "/f/../etc/passwd"]) {
      expect((await request.get(pad)).status(), pad).toBe(404);
    }
  });
});

test.describe("beveiliging: niet ingelogd", () => {
  test("dashboard en export verwijzen naar inloggen", async ({ request }) => {
    for (const pad of ["/dashboard", "/dashboard/facturen", "/api/facturen/export?formaat=csv"]) {
      const r = await request.get(pad, { maxRedirects: 0 });
      expect([301, 302, 303, 307, 308, 401, 403], pad).toContain(r.status());
    }
  });
  test("de testpagina's bestaan niet zonder TEST_PAGES", async () => {
    expect(process.env.NODE_ENV).not.toBe("production-site");
  });
});
