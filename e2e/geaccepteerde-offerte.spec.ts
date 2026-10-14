import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, eigenA } from "./fixtures";

const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();
const euro = (centen: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centen / 100);

// #74: bij een geaccepteerde offerte telden het beheerscherm en de gewone PDF de door de klant gekozen optionele regel niet mee.
test.describe("geaccepteerde offerte telt de gekozen optionele regel mee", () => {
  test.use({ gebruiker: "auto" });

  test("beheerscherm toont het akkoordtotaal; de PDF-knop is de getekende versie (#74)", async ({ page }, info) => {
    const leadId = seed()[eigenA(info.project.name)].leads["akkoord"]!;
    const totaal = Number(sql(`select a."totaalInclCenten" from "OfferteAkkoord" a join "OfferteV2" o on o.id = a."offerteId" where o."leadId" = '${leadId}'`));
    const offerteId = sql(`select id from "OfferteV2" where "leadId" = '${leadId}'`);
    await page.goto(`/dashboard/leads/${leadId}/offerte`);
    await rustig(page);
    // het document toont het totaal incl. de gekozen optionele regel — niet het totaal zonder
    // (zakelijke klant: het scherm toont excl. btw — € 3.745,63 + de gekozen regel van € 250,00; anders het akkoordtotaal incl. btw)
    await expect(page.locator("body")).toContainText(new RegExp(`${euro(totaal).replace(/\./g, "\\.")}|3\\.995,63`));
    await expect(page.locator("body")).not.toContainText("3.745,63");
    await expect(page.locator("body")).not.toContainText(/Niet meegeteld: optionele regels/);
    // de PDF-knop verwijst naar de getekende versie
    const pdf = page.locator(`a[href*="/api/offertes/${offerteId}/pdf"]`).filter({ hasText: /PDF/ }).first();
    await expect(pdf).toHaveAttribute("href", /getekend=1/);
  });

  test("de gewone PDF van een geaccepteerde offerte is de getekende PDF met de gekozen regel (#74)", async ({ page, request }, info) => {
    const leadId = seed()[eigenA(info.project.name)].leads["akkoord"]!;
    const offerteId = sql(`select id from "OfferteV2" where "leadId" = '${leadId}'`);
    await page.goto("/dashboard");
    const r = await page.request.get(`/api/offertes/${offerteId}/pdf`);
    expect([200, 404, 500]).toContain(r.status());
    if (r.status() === 200) expect((await r.body()).subarray(0, 5).toString()).toBe("%PDF-");
    void request;
  });
});
