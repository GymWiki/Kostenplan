import { test } from "./fixtures";
const paginas = ["/dashboard", "/dashboard/tools", "/dashboard/leads", "/dashboard/facturen", "/dashboard/profiel", "/dashboard/profiel/bedrijfsgegevens", "/dashboard/profiel/werkgebied", "/dashboard/profiel/offerte-instellingen", "/dashboard/profiel/abonnement", "/probeer", "/prijzen", "/voorbeelden"];
test.describe("axe-dump", () => {
  test.use({ gebruiker: "auto" });
  for (const pad of paginas) {
    test(`dump ${pad}`, async ({ page }) => {
      await page.goto(pad);
      await page.waitForLoadState("networkidle");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      await page.evaluate(require("axe-core").source);
      const r = await page.evaluate(() => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
      for (const v of r.violations.filter((x: any) => x.impact === "serious" || x.impact === "critical"))
        for (const n of v.nodes) console.log(`AXE ${pad} | ${v.id} | ${n.html.slice(0, 230).replace(/\n/g, " ")} | ${(n.any[0]?.message ?? n.failureSummary ?? "").slice(0, 160).replace(/\n/g, " ")}`);
    });
  }
});
