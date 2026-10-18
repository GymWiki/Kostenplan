import { execFileSync } from "node:child_process";
import { test, expect, seed, rustig, pdokNep, eigenA } from "./fixtures";
import type { Page } from "@playwright/test";

// Werktempo per onderdeel in uur, dagdeel of dag (412 × 915 mobiel = hovenier A1, 1440 × 900 desktop = A2).
// De kernregel: de prijs van de klant-rekentool (gouden voorbeeld € 2.317,15) is voor en na elke wissel gelijk.
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();
const GOUD = /2\.317,15/;

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ toolSlot }) => {
  void toolSlot;
});

type Stand = { producten: { id: string; productiviteit: string; eenheid: string; override: string }[]; materialen: { id: string; tempo: string }[]; kosten: string; uren: string };
let stand: Stand | null = null;
const q = (x: string | null | undefined) => (x === null || x === undefined || x === "" ? "NULL" : x);

// Zet alles terug zoals het was, zodat andere specs dezelfde rekentool zien.
function bewaar(toolId: string, companyId: string) {
  const rij = (s: string) => sql(s).split("\n").filter(Boolean).map((r) => r.split("|"));
  stand = {
    producten: rij(`SELECT id, coalesce(productiviteit::text,''), coalesce("werktempoEenheid"::text,''), coalesce("arbeidTariefOverride"::text,'') FROM "Product" WHERE "toolId"='${toolId}'`).map(([id, p, e, o]) => ({ id: id!, productiviteit: p!, eenheid: e!, override: o! })),
    materialen: rij(`SELECT m.id, coalesce(m."productiviteitOverride"::text,'') FROM "MaterialOption" m JOIN "MaterialCategory" c ON c.id=m."materialCategoryId" JOIN "Product" p ON p.id=c."productId" WHERE p."toolId"='${toolId}'`).map(([id, t]) => ({ id: id!, tempo: t! })),
    kosten: sql(`SELECT "arbeidStapEenheid" || '|' || "arbeidTariefUur" || '|' || "arbeidTariefDagdeel" || '|' || "arbeidTariefDag" || '|' || "gebruiktAccountArbeidTarief" FROM "CostSettings" WHERE "toolId"='${toolId}'`),
    uren: sql(`SELECT "urenPerDagdeel" || '|' || "urenPerDag" FROM "Company" WHERE id='${companyId}'`),
  };
}
function herstel(toolId: string, companyId: string) {
  if (!stand) return;
  for (const p of stand.producten) sql(`UPDATE "Product" SET productiviteit=${q(p.productiviteit)}, "werktempoEenheid"=${p.eenheid ? `'${p.eenheid}'::"ArbeidStapEenheid"` : "NULL"}, "arbeidTariefOverride"=${q(p.override)} WHERE id='${p.id}'`);
  for (const m of stand.materialen) sql(`UPDATE "MaterialOption" SET "productiviteitOverride"=${q(m.tempo)} WHERE id='${m.id}'`);
  const [e, uur, dagdeel, dag, vlag] = stand.kosten.split("|");
  sql(`UPDATE "CostSettings" SET "arbeidStapEenheid"='${e}'::"ArbeidStapEenheid", "arbeidTariefUur"=${uur}, "arbeidTariefDagdeel"=${dagdeel}, "arbeidTariefDag"=${dag}, "gebruiktAccountArbeidTarief"=${vlag === "t"} WHERE "toolId"='${toolId}'`);
  const [a, b] = stand.uren.split("|");
  sql(`UPDATE "Company" SET "urenPerDagdeel"=${a}, "urenPerDag"=${b} WHERE id='${companyId}'`);
}

// Mobiel: het onderdeel opent in een sheet (die na een herlaad al openstaat) met het blok "Werktempo".
async function openTempo(page: Page, mobiel: boolean) {
  if (!mobiel) return;
  if (!(await page.locator("#tempo-knop").isVisible())) await page.getByRole("button", { name: /^Schutting/ }).first().click();
  if ((await page.locator("#tempo-knop").getAttribute("aria-expanded")) !== "true") await page.locator("#tempo-knop").click();
}

async function goudPrijs(page: Page, project: string) {
  const s = seed()[eigenA(project)];
  sql(`UPDATE "Tool" SET "weergaveConfig" = '{"weergave":"stappen"}'::jsonb WHERE id = '${s.tools.tuinaanleg}'`);
  await pdokNep(page.context());
  // Het tuinplan van een vorig bezoek (sessionStorage) mag de keuze niet omdraaien.
  await page.addInitScript(() => window.sessionStorage.clear());
  await page.goto(`/t/${s.bedrijfSlug}/${s.tuinaanlegSlug}`);
  await rustig(page);
  await expect(async () => {
    await page.locator("#wg-adres").fill("8011AB 5");
    await page.getByRole("option").first().click({ timeout: 3000 });
  }).toPass({ timeout: 30000 });
  await page.locator("button[aria-pressed]").filter({ hasText: /^Schutting/ }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByLabel(/Aantal Schutting/).fill("20");
  await page.getByRole("button", { name: /Douglas schutting/ }).click();
  await expect(page.getByText(/Tot nu toe:/)).toContainText(GOUD);
}

test.describe("werktempo-eenheid", () => {
  test.use({ gebruiker: "auto" });
  let toolId = "";
  let companyId = "";
  let schuttingId = "";

  test.beforeEach(async ({}, info) => {
    const s = seed()[eigenA(info.project.name)];
    toolId = s.tools.tuinaanleg;
    companyId = s.company1;
    schuttingId = sql(`SELECT id FROM "Product" WHERE "toolId"='${toolId}' AND naam='Schutting'`);
    // Deze tests gaan uit van de gewone testdata: rekentool per uur, het bedrijfstarief van € 45 per uur, dagdeel 4 en dag 8 uur.
    sql(`UPDATE "CostSettings" SET "arbeidStapEenheid"='UUR', "gebruiktAccountArbeidTarief"=true WHERE "toolId"='${toolId}'`);
    sql(`UPDATE "Company" SET "standaardArbeidTariefUur"=45 WHERE id='${companyId}'`);
    sql(`UPDATE "Company" SET "urenPerDagdeel"=4, "urenPerDag"=8 WHERE id='${companyId}'`);
    bewaar(toolId, companyId);
  });
  test.afterEach(async () => {
    herstel(toolId, companyId);
  });

  test("onderdeel: eigen eenheid kiezen met dialog; annuleren laat alles staan; bevestigen rekent om, prijs gelijk; terugzetten naar standaard", async ({ page }, info) => {
    const mobiel = info.project.name === "mobiel";
    const tempoVoor = Number(sql(`SELECT productiviteit FROM "Product" WHERE id='${schuttingId}'`));
    expect(tempoVoor).toBeGreaterThan(0);
    await page.goto(mobiel ? `/dashboard/tools/${toolId}` : `/dashboard/tools/${toolId}?paneel=${encodeURIComponent(`werkzaamheid:${schuttingId}`)}`);
    await rustig(page);
    await openTempo(page, mobiel);
    const keuze = page.getByLabel("Rekenen met");
    await expect(keuze).toBeVisible();
    await expect(keuze.locator("option:checked")).toHaveText("Standaard (uur)");

    // Annuleren: niets opgeslagen, de keuze springt terug.
    await keuze.selectOption("DAGDEEL");
    const dialoog = page.getByRole("alertdialog");
    await expect(dialoog).toContainText(/per uur/);
    await expect(dialoog).toContainText(new RegExp(`${String(tempoVoor).replace(".", ",")} m per uur.*wordt.*${String(tempoVoor * 4).replace(".", ",")} m per dagdeel`));
    await expect(dialoog).toContainText("De prijs blijft gelijk");
    await dialoog.getByRole("button", { name: "Annuleren" }).click();
    await expect(dialoog).toBeHidden();
    await expect(keuze.locator("option:checked")).toHaveText("Standaard (uur)");
    expect(sql(`SELECT coalesce("werktempoEenheid"::text,'') || '|' || productiviteit FROM "Product" WHERE id='${schuttingId}'`)).toBe(`|${tempoVoor}`);

    // Bevestigen: eenheid en omgerekend werktempo samen.
    await keuze.selectOption("DAGDEEL");
    await dialoog.getByRole("button", { name: "Bevestigen" }).click();
    await expect(dialoog).toBeHidden();
    await expect.poll(() => sql(`SELECT "werktempoEenheid"::text || '|' || productiviteit FROM "Product" WHERE id='${schuttingId}'`)).toBe(`DAGDEEL|${tempoVoor * 4}`);
    await expect(keuze.locator("option:checked")).toHaveText("Dagdeel");
    await expect(page.getByText(/Eigen instelling/)).toBeVisible();
    // Na herladen staat het er nog en de autosave heeft het werktempo niet teruggezet.
    await page.waitForTimeout(1500);
    await page.reload();
    await rustig(page);
    await openTempo(page, mobiel);
    await expect(page.getByLabel("Rekenen met").locator("option:checked")).toHaveText("Dagdeel");
    expect(sql(`SELECT "werktempoEenheid"::text || '|' || productiviteit FROM "Product" WHERE id='${schuttingId}'`)).toBe(`DAGDEEL|${tempoVoor * 4}`);

    // De klant ziet dezelfde prijs.
    await goudPrijs(page, info.project.name);

    // Terugzetten naar standaard rekent terug naar dagdelen.
    await page.goto(mobiel ? `/dashboard/tools/${toolId}` : `/dashboard/tools/${toolId}?paneel=${encodeURIComponent(`werkzaamheid:${schuttingId}`)}`);
    await rustig(page);
    await openTempo(page, mobiel);
    await page.getByRole("button", { name: "Terugzetten naar standaard" }).click();
    await expect(page.getByRole("alertdialog")).toContainText(/per dagdeel.*wordt.*per uur/);
    await page.getByRole("alertdialog").getByRole("button", { name: "Bevestigen" }).click();
    await expect.poll(() => sql(`SELECT coalesce("werktempoEenheid"::text,'') || '|' || productiviteit FROM "Product" WHERE id='${schuttingId}'`)).toBe(`|${tempoVoor}`);
    await goudPrijs(page, info.project.name);
  });

  test("instellingen: de eenheid van de rekentool wisselen met dialog (annuleren, bevestigen); werktempo's en prijs kloppen, eigen eenheid blijft", async ({ page }, info) => {
    // Eén onderdeel met een eigen eenheid (dag): dat blijft ongemoeid.
    const kunstgras = sql(`SELECT id FROM "Product" WHERE "toolId"='${toolId}' AND naam='Kunstgras'`);
    const kunstgrasTempo = sql(`SELECT productiviteit FROM "Product" WHERE id='${kunstgras}'`);
    sql(`UPDATE "Product" SET "werktempoEenheid"='DAG', productiviteit=productiviteit*8 WHERE id='${kunstgras}'`);
    const eigenTempo = sql(`SELECT productiviteit FROM "Product" WHERE id='${kunstgras}'`);
    const schuttingVoor = Number(sql(`SELECT productiviteit FROM "Product" WHERE id='${schuttingId}'`));
    await page.goto(`/dashboard/tools/${toolId}/prijzen`);
    await rustig(page);
    const select = page.locator("#arbeidStapEenheid");
    await select.selectOption("DAGDEEL");
    const dialoog = page.getByRole("alertdialog");
    await expect(dialoog).toContainText("Je tarief wordt € 180,00 per dagdeel");
    await expect(dialoog).toContainText(/1 onderdeel heeft een eigen eenheid/);
    await dialoog.getByRole("button", { name: "Annuleren" }).click();
    await expect(select).toHaveValue("UUR");
    expect(sql(`SELECT "arbeidStapEenheid" FROM "CostSettings" WHERE "toolId"='${toolId}'`)).toBe("UUR");
    expect(Number(sql(`SELECT productiviteit FROM "Product" WHERE id='${schuttingId}'`))).toBe(schuttingVoor);

    await select.selectOption("DAGDEEL");
    await dialoog.getByRole("button", { name: "Bevestigen" }).click();
    await expect.poll(() => sql(`SELECT "arbeidStapEenheid" FROM "CostSettings" WHERE "toolId"='${toolId}'`)).toBe("DAGDEEL");
    expect(Number(sql(`SELECT "arbeidTariefDagdeel" FROM "CostSettings" WHERE "toolId"='${toolId}'`))).toBeCloseTo(180, 9);
    expect(Number(sql(`SELECT productiviteit FROM "Product" WHERE id='${schuttingId}'`))).toBeCloseTo(schuttingVoor * 4, 9);
    expect(sql(`SELECT "werktempoEenheid"::text || '|' || productiviteit FROM "Product" WHERE id='${kunstgras}'`)).toBe(`DAG|${eigenTempo}`);
    expect(kunstgrasTempo).not.toBe("");
    await goudPrijs(page, info.project.name);
  });

  test("profiel: uren per dagdeel en per dag met duidelijke meldingen; opslaan vraagt bevestiging; de prijs verandert niet", async ({ page }, info) => {
    await page.goto("/dashboard/profiel/tarieven");
    await rustig(page);
    const dagdeel = page.getByLabel("Een dagdeel is … uur");
    const dag = page.getByLabel("Een dag is … uur");
    await expect(dagdeel).toHaveValue("4");
    await expect(dag).toHaveValue("8");
    const opslaan = page.getByRole("button", { name: "Uren opslaan" });
    await expect(opslaan).toBeDisabled();

    await dagdeel.fill("9");
    await opslaan.click();
    await expect(page.getByText("Een dagdeel kan niet langer zijn dan een dag.")).toBeVisible();
    await dagdeel.fill("0");
    await opslaan.click();
    await expect(page.getByText(/meer dan 0 uur/)).toBeVisible();
    await dag.fill("25");
    await dagdeel.fill("4");
    await opslaan.click();
    await expect(page.getByText(/niet langer dan 24 uur/)).toBeVisible();
    expect(sql(`SELECT "urenPerDagdeel" || '|' || "urenPerDag" FROM "Company" WHERE id='${companyId}'`)).toBe("4|8");

    await dagdeel.fill("3,5");
    await dag.fill("7,5");
    await opslaan.click();
    const dialoog = page.getByRole("alertdialog");
    await expect(dialoog).toContainText("3,5 uur");
    await expect(dialoog).toContainText("7,5 uur");
    await expect(dialoog).toContainText("er verandert niets aan je prijzen");
    await dialoog.getByRole("button", { name: "Annuleren" }).click();
    expect(sql(`SELECT "urenPerDagdeel" || '|' || "urenPerDag" FROM "Company" WHERE id='${companyId}'`)).toBe("4|8");
    await opslaan.click();
    await dialoog.getByRole("button", { name: "Bevestigen" }).click();
    await expect.poll(() => sql(`SELECT "urenPerDagdeel" || '|' || "urenPerDag" FROM "Company" WHERE id='${companyId}'`)).toBe("3.5|7.5");
    await goudPrijs(page, info.project.name);
  });
});

test("gast: het werktempo staat in de eenheid van het tarief; geen keuze 'Rekenen met'", async ({ page }, info) => {
  void info;
  await page.addInitScript(() => window.localStorage.removeItem("kostenplan:draft:v1"));
  await page.goto("/probeer/editor");
  await expect(page.getByLabel("Rekenen met")).toHaveCount(0);
});
