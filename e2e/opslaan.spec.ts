import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, eigenA } from "./fixtures";

const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

// #71: offline bewerken bleef "Opslaan…" en ging verloren. #69: twee tabbladen overschreven elkaar stilzwijgend.
test.describe("opslaan van de offerte-editor", () => {
  test.describe.configure({ mode: "serial" }); // beide tests bewerken dezelfde offerte
  test.use({ gebruiker: "auto" });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "mobiel", "regels bewerken gaat op mobiel via een sheet; de opslaglogica is dezelfde en staat hier op desktop");
  });

  const omschrijving = (page: import("@playwright/test").Page) => page.locator('input[aria-label="Omschrijving"]').nth(1);
  const opEditor = async (page: import("@playwright/test").Page, leadSleutel: string, info: import("@playwright/test").TestInfo) => {
    await page.goto(`/dashboard/leads/${seed()[eigenA(info.project.name)].leads[leadSleutel]}/offerte`);
    await rustig(page);
    await expect(omschrijving(page)).toBeVisible();
  };

  test("offline bewerken: 'Niet opgeslagen' met 'Opnieuw proberen', daarna vanzelf opgeslagen zodra je weer online bent (#71)", async ({ page, context }, info) => {
    await opEditor(page, "offerte-concept", info);
    await context.setOffline(true);
    await omschrijving(page).fill("Offline bewerkt terras");
    await expect(page.getByText("Niet opgeslagen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Opnieuw proberen" })).toBeVisible();
    await expect(page.getByText("Opslaan…")).toHaveCount(0);
    // de wijziging blijft in beeld
    await expect(omschrijving(page)).toHaveValue("Offline bewerkt terras");
    await context.setOffline(false);
    await expect(page.getByText("Alles opgeslagen")).toBeVisible({ timeout: 15000 });
    await page.reload();
    await rustig(page);
    await expect(omschrijving(page)).toHaveValue("Offline bewerkt terras");
  });

  test("twee tabbladen: de oudste opslag wordt geweigerd met een melding, in beide volgordes (#69)", async ({ page, context }, info) => {
    await opEditor(page, "offerte-concept", info);
    const tab2 = await context.newPage();
    await opEditor(tab2, "offerte-concept", info);

    // volgorde 1: tab 1 slaat op, tab 2 (verouderd) wordt geweigerd
    await page.bringToFront();
    await omschrijving(page).fill("Van tabblad één");
    await expect(page.getByText("Alles opgeslagen")).toBeVisible({ timeout: 10000 });
    await tab2.bringToFront();
    await omschrijving(tab2).fill("Van tabblad twee");
    await expect(tab2.getByRole("alert").filter({ hasText: "in een ander tabblad of door iemand anders gewijzigd" })).toBeVisible({ timeout: 10000 });
    await expect(omschrijving(tab2)).toHaveValue("Van tabblad twee"); // eigen wijziging blijft zichtbaar
    await tab2.getByRole("button", { name: "Nieuwste versie laden" }).click();
    await expect(omschrijving(tab2)).toHaveValue("Van tabblad één");
    await expect(tab2.getByRole("alert").filter({ hasText: "ander tabblad" })).toHaveCount(0);

    // volgorde 2: nu slaat tab 2 op (op de nieuwste stand); tab 1 is verouderd en wordt geweigerd
    await tab2.bringToFront();
    await omschrijving(tab2).fill("Tweede ronde van tabblad twee");
    await expect(tab2.getByText("Alles opgeslagen")).toBeVisible({ timeout: 10000 });
    await page.bringToFront();
    await omschrijving(page).fill("Tweede ronde van tabblad één");
    await expect(page.getByRole("alert").filter({ hasText: "in een ander tabblad of door iemand anders gewijzigd" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Nieuwste versie laden" }).click();
    await expect(omschrijving(page)).toHaveValue("Tweede ronde van tabblad twee");
  });
});

test.describe("betaling registreren (verouderd tabblad, offline)", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ gebruiker: "auto" });

  test("een verouderd tabblad toont na de weigering het juiste openstaande bedrag (#69)", async ({ page }, info) => {
    const id = seed()[eigenA(info.project.name)].facturen["verstuurd"]!;
    const totaal = Number(sql(`select "totaalInclCenten" from "Factuur" where id='${id}'`));
    const betaaldVoor = Number(sql(`select coalesce(sum("bedragCenten"),0) from "FactuurBetaling" where "factuurId"='${id}'`));
    const aantalVoor = Number(sql(`select count(*) from "FactuurBetaling" where "factuurId"='${id}'`));
    await page.goto(`/dashboard/facturen/${id}`);
    await rustig(page);
    const sectie = page.locator("section[aria-label='Beheer van deze factuur']");
    const vol = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2 }).format((totaal - betaaldVoor) / 100);
    await expect(sectie).toContainText(vol);

    // Intussen registreert iemand anders (een ander tabblad of een collega) een deelbetaling van € 100,00; dit scherm is nu verouderd.
    sql(`insert into "FactuurBetaling" (id, "factuurId", datum, "bedragCenten", methode) values ('e2e-${Date.now()}', '${id}', current_date, 10000, 'OVERBOEKING')`);

    // Dit scherm probeert het hele oude openstaande bedrag te registreren: de server weigert (actuele stand) en het scherm ververst.
    await page.getByRole("button", { name: "Betaling registreren" }).click();
    await page.getByRole("button", { name: "Betaling opslaan" }).click();
    await expect(page.getByText(/meer dan het openstaande bedrag/)).toBeVisible({ timeout: 15000 });
    const nu = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2 }).format((totaal - betaaldVoor - 10000) / 100);
    try {
      await expect(sectie).toContainText(nu, { timeout: 15000 });
    } catch (e) {
      console.log("DEBUG sectie:", (await sectie.innerText()).replace(/\n/g, " | ").slice(0, 200), "| verwacht:", nu, "| sheet:", (await page.locator("[role=dialog]").innerText().catch(() => "geen")).replace(/\n/g, " | ").slice(0, 300));
      throw e;
    }
    expect(Number(sql(`select count(*) from "FactuurBetaling" where "factuurId"='${id}'`))).toBe(aantalVoor + 1); // alleen de ingevoegde betaling: de geweigerde is niet opgeslagen
  });

  test("offline een betaling registreren geeft een Nederlandse melding, geen foutpagina (#71)", async ({ page, context }, info) => {
    await page.goto(`/dashboard/facturen/${seed()[eigenA(info.project.name)].facturen["te-laat"]}`);
    await rustig(page);
    await page.getByRole("button", { name: "Betaling registreren" }).click();
    await page.locator("#bt-bedrag").fill("10,00");
    await context.setOffline(true);
    await page.getByRole("button", { name: "Betaling opslaan" }).click();
    await expect(page.getByText(/Geen verbinding/)).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=/Application error|Internal Server Error|Failed to fetch/")).toHaveCount(0);
    await context.setOffline(false);
  });
});
