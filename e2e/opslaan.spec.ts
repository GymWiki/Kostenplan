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

  test("een verouderd tabblad toont na de weigering het juiste openstaande bedrag (#69)", async ({ page, context }, info) => {
    const id = seed()[eigenA(info.project.name)].facturen["verstuurd"]!;
    const totaal = Number(sql(`select "totaalInclCenten" from "Factuur" where id='${id}'`));
    const betaaldVoor = Number(sql(`select coalesce(sum("bedragCenten"),0) from "FactuurBetaling" where "factuurId"='${id}'`));
    await page.goto(`/dashboard/facturen/${id}`);
    await rustig(page);
    const tab2 = await context.newPage();
    await tab2.goto(`/dashboard/facturen/${id}`);
    await rustig(tab2);

    // tab 1 registreert een deelbetaling van € 100,00
    await page.bringToFront();
    await page.getByRole("button", { name: "Betaling registreren" }).click();
    await page.locator("#bt-bedrag").fill("100,00");
    await page.getByRole("button", { name: "Betaling opslaan" }).click();
    try {
      await expect(page.locator("section[aria-label='Beheer van deze factuur']")).toContainText(/100,00/, { timeout: 15000 });
    } catch (e) {
      console.log("DEBUG betalingen:", sql(`select count(*) from "FactuurBetaling" where "factuurId"='${id}'`), "sheet zichtbaar:", await page.getByRole("button", { name: "Betaling opslaan" }).count(), "tekst:", (await page.locator("body").innerText()).slice(0, 300).replace(/\n/g, " | "));
      throw e;
    }

    // tab 2 (verouderd: nog het volledige bedrag openstaand) probeert het hele oude bedrag te registreren
    await tab2.bringToFront(); // een tabblad op de achtergrond krijgt van de browser geen animatieframes: React zou niet renderen
    await tab2.getByRole("button", { name: "Betaling registreren" }).click();
    await tab2.getByRole("button", { name: "Betaling opslaan" }).click();
    await expect(tab2.getByText(/meer dan het openstaande bedrag/)).toBeVisible({ timeout: 15000 });
    const open = totaal - betaaldVoor - 10000;
    const tekst = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(open / 100).replace(/\s/g, " ");
    await expect(tab2.locator("section[aria-label='Beheer van deze factuur']")).toContainText(tekst.replace("€ ", "").replace(/ /g, " "), { timeout: 15000 });
    expect(Number(sql(`select count(*) from "FactuurBetaling" where "factuurId"='${id}'`))).toBeGreaterThan(0);
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
