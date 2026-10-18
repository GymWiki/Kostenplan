import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, eigenA } from "./fixtures";

// Badge "N nieuwe aanvragen" op de rekentoolkaart (mobiel 412 en desktop 1440): eigen link naar de gefilterde aanvragen,
// de rest van de kaart opent de editor, nooit een link in een link.
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

test.describe.configure({ mode: "serial" });
test.use({ gebruiker: "auto" });

const NAMEN = ["Kaarttest Een", "Kaarttest Twee"];

test.describe("rekentoolkaart: nieuwe aanvragen", () => {
  let toolId = "";
  let companyId = "";

  test.beforeEach(async ({}, info) => {
    const s = seed()[eigenA(info.project.name)];
    toolId = s.tools.onderhoud;
    companyId = s.company1;
    // Precies twee nieuwe aanvragen voor "Onderhoud" (de seed heeft daar er geen); één aanvraag in behandeling telt niet mee.
    sql(`DELETE FROM "Lead" WHERE "toolId" = '${toolId}' AND naam LIKE 'Kaarttest %'`);
    const rij = (naam: string, status: string, i: number) =>
      `('kaarttest-${info.project.name}-${i}-${Date.now()}', '${companyId}', '${toolId}', 'Onderhoud', '${naam}', 'kaarttest${i}@example.nl', '${status}', '{"regels":[],"totaal":100}'::jsonb, 100, 'kaarttest-${info.project.name}-${i}-${Date.now()}', now(), now())`;
    sql(
      `INSERT INTO "Lead" (id, "companyId", "toolId", "toolNaamSnapshot", naam, email, status, snapshot, "totaalIndicatie", "idempotentieSleutel", "createdAt", "updatedAt") VALUES ` +
        [rij(NAMEN[0], "NIEUW", 1), rij(NAMEN[1], "NIEUW", 2), rij("Kaarttest Behandeling", "IN_BEHANDELING", 3)].join(", ")
    );
  });
  test.afterEach(async () => {
    sql(`DELETE FROM "Lead" WHERE "toolId" = '${toolId}' AND naam LIKE 'Kaarttest %'`);
  });

  test("de badge zegt '2 nieuwe aanvragen', opent de gefilterde lijst; de rest van de kaart opent de editor", async ({ page }) => {
    await page.goto("/dashboard/tools");
    await rustig(page);
    const kaart = page.locator(`[data-kaart="${toolId}"]:visible`);
    const badge = kaart.getByRole("link", { name: "Bekijk 2 nieuwe aanvragen van Onderhoud" });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("2 nieuwe aanvragen");
    expect((await badge.boundingBox())!.height, "raakvlak van de badge").toBeGreaterThanOrEqual(44);
    expect(await page.locator("a a").count(), "geen link in een link").toBe(0);
    await expect(page.getByText(/nieuwe lead/i)).toHaveCount(0);

    // Tikken op de badge: gefilterde lijst met een zichtbaar filter en "Wis filter".
    await badge.click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/leads\\?status=nieuw&tool=${toolId}`));
    const filter = page.getByTestId("actief-filter");
    await expect(filter).toContainText("nieuwe aanvragen");
    await expect(filter).toContainText("Onderhoud");
    const zichtbaar = (t: string) => page.getByText(t).and(page.locator(":visible"));
    await expect(zichtbaar(NAMEN[0]).first()).toBeVisible();
    await expect(zichtbaar(NAMEN[1]).first()).toBeVisible();
    await expect(zichtbaar("Kaarttest Behandeling")).toHaveCount(0);
    await expect(zichtbaar("Nina Nieuw")).toHaveCount(0); // nieuwe aanvraag van een andere rekentool
    await filter.getByRole("button", { name: "Wis filter" }).click();
    await expect(page).not.toHaveURL(/status=|tool=/);
    await expect(page.getByTestId("actief-filter")).toHaveCount(0);

    // Tikken op de rest van de kaart opent de editor.
    await page.goto("/dashboard/tools");
    await rustig(page);
    await page.locator(`[data-kaart="${toolId}"]:visible`).getByText(/^\d+ onderdelen?$/).click({ force: true }); // de uitgerekte link van de kaart vangt de klik op: precies wat een gebruiker meemaakt
    await expect(page).toHaveURL(new RegExp(`/dashboard/tools/${toolId}$`));
  });

  test("zonder nieuwe aanvragen is er geen badge; 1 aanvraag staat in het enkelvoud", async ({ page }) => {
    sql(`DELETE FROM "Lead" WHERE "toolId" = '${toolId}' AND naam = '${NAMEN[1]}'`);
    await page.goto("/dashboard/tools");
    await rustig(page);
    await expect(page.locator(`[data-kaart="${toolId}"]:visible`).getByRole("link", { name: "Bekijk 1 nieuwe aanvraag van Onderhoud" })).toHaveText("1 nieuwe aanvraag");
    sql(`DELETE FROM "Lead" WHERE "toolId" = '${toolId}' AND naam LIKE 'Kaarttest %'`);
    await page.reload();
    await rustig(page);
    await expect(page.locator(`[data-kaart="${toolId}"]:visible`).getByRole("link", { name: /nieuwe aanvra/ })).toHaveCount(0);
  });
});
