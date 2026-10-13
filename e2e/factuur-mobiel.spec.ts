import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, eigenA } from "./fixtures";

const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

// #68: op mobiel lag de tabbalk over "Definitief maken". #78: de kop zei altijd "Verstuurd".
test.describe("factuur op mobiel: bereikbare actieknop en echte status", () => {
  test.use({ gebruiker: "auto" });

  for (const [naam, viewport] of [["412×915", { width: 412, height: 915 }], ["360×780", { width: 360, height: 780 }]] as const) {
    test(`Definitief maken is aan te tikken, er ligt niets overheen (${naam}) (#68)`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobiel", "alleen op mobiel");
      await page.setViewportSize(viewport);
      await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen["concept"]}`);
      await rustig(page);
      const knop = page.getByRole("button", { name: /Definitief maken/ }).and(page.locator(":visible")).first();
      await expect(knop).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Hoofdmenu" })).toHaveCount(0);
      const raak = await knop.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { zelf: hit === el || el.contains(hit), tag: hit?.tagName ?? null, tekst: hit?.textContent?.slice(0, 40) ?? null };
      });
      expect(raak.zelf, `op het midden van de knop ligt ${raak.tag} "${raak.tekst}"`).toBe(true);
    });
  }

  const statussen: [string, RegExp][] = [
    ["concept", /^Concept$/],
    ["verstuurd", /^Verstuurd op \d{1,2} \w+ \d{4}$/],
    ["te-laat", /^Te laat$/],
    ["betaald", /^Betaald$/],
  ];
  for (const [sleutel, verwacht] of statussen) {
    test(`de kop van een ${sleutel}e factuur toont de echte status (#78)`, async ({ page }, info) => {
      await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen[sleutel]}`);
      await rustig(page);
      const kop = page.locator("header, [data-editor-kop]").locator("span, div").filter({ hasText: verwacht }).last();
      await expect(page.getByText(verwacht).first()).toBeVisible();
      expect(await kop.count()).toBeGreaterThan(0);
      // nooit de vaste tekst "✓ Verstuurd" zonder datum, behalve bij een echt verstuurde factuur
      if (sleutel === "concept") await expect(page.getByText(/^Verstuurd$/)).toHaveCount(0);
    });
  }

  test("een definitieve factuur die nog niet als verstuurd is bevestigd heet 'Definitief – nog niet verstuurd' (#78)", async ({ page }, info) => {
    const id = seed()[eigenA(info.project.name)].facturen["verstuurd"];
    const oud = sql(`select status || '|' || coalesce("verstuurdOp"::text,'') from "Factuur" where id='${id}'`);
    sql(`update "Factuur" set status='DEFINITIEF', "verstuurdOp"=null where id='${id}'`);
    try {
      await page.goto(`/dashboard/facturen/${id}`);
      await rustig(page);
      await expect(page.getByText("Definitief – nog niet verstuurd").first()).toBeVisible();
      await expect(page.getByText(/^Verstuurd/)).toHaveCount(0);
    } finally {
      const [status, op] = oud.split("|");
      sql(`update "Factuur" set status='${status}', "verstuurdOp"=${op ? `'${op}'` : "null"} where id='${id}'`);
    }
  });
});
