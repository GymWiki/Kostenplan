import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { berekenPrijs } from "@/app/lib/pricing/engine";
import { configVanProducten, invoerVanKlant } from "@/app/lib/pricing/adapters";
import { resolveCostSettings } from "@/app/lib/tools";
import { convertWerktempo } from "@/app/lib/werktempo";
import { pasUrenToe, pasProductEenheidToe, pasRekenEenheidToe, planRekenEenheid, planUren, type Tx } from "./werktempo-server";

// Databasetests: omrekenen van werktempo's bij een wissel (eenheid van de rekentool, eenheid van één product, uren-definities).
// Draait alleen met TEST_DATABASE_URL (zie docs/testing.md).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("werktempo omrekenen (database)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 5 }) });
  const sleutel = `wt${Date.now()}`;
  let companyId = "";
  let toolId = "";
  const ids: Record<string, string> = {};
  const tx = (c: typeof db) => c as unknown as Tx;

  async function prijzen(): Promise<Record<string, number>> {
    const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
    const cs = await db.costSettings.findUniqueOrThrow({ where: { toolId } });
    const producten = await db.product.findMany({ where: { toolId }, include: { materiaalCategorieen: { include: { materialen: true } }, extraOpties: true } });
    const kosten = resolveCostSettings(cs, company);
    const uit: Record<string, number> = {};
    for (const p of producten) {
      const r = berekenPrijs(configVanProducten([p], { ...kosten, voorrijTarief: 0 }), invoerVanKlant({ producten: [p], hoeveelheden: { [p.id]: 41 }, materiaalKeuzes: { [p.materiaalCategorieen[0]!.id]: p.materiaalCategorieen[0]!.materialen[0]!.id } }));
      uit[p.naam] = r.kosten.arbeid;
    }
    return uit;
  }

  beforeAll(async () => {
    const user = await db.user.create({ data: { id: `u-${sleutel}`, email: `${sleutel}@test.nl` } });
    // Aangepaste definities: dagdeel = 3,5 uur, dag = 7,5 uur.
    const c = await db.company.create({ data: { naam: "Test", slug: sleutel, createdBy: user.id, urenPerDagdeel: 3.5, urenPerDag: 7.5, standaardArbeidTariefUur: 40 } });
    companyId = c.id;
    const tool = await db.tool.create({ data: { companyId, naam: "Aanleg", slug: "aanleg", costSettings: { create: { arbeidStapEenheid: "UUR", gebruiktAccountArbeidTarief: true, transportTarief: 0 } } } });
    toolId = tool.id;
    const maak = async (naam: string, data: { werktempoEenheid?: "UUR" | "DAGDEEL" | "DAG"; productiviteit: number | null; arbeidTariefOverride?: number | null; materiaalTempo?: number | null }) => {
      const p = await db.product.create({
        data: {
          toolId,
          naam,
          eenheid: "m2",
          productiviteit: data.productiviteit,
          werktempoEenheid: data.werktempoEenheid ?? null,
          arbeidTariefOverride: data.arbeidTariefOverride ?? null,
          materiaalCategorieen: { create: { naam: "Materiaal", verplicht: true, materialen: { create: { naam: "M", prijs: 10, productiviteitOverride: data.materiaalTempo ?? null } } } },
        },
      });
      ids[naam] = p.id;
    };
    await maak("volgt", { productiviteit: 12, materiaalTempo: 6 });
    await maak("volgt-tarief", { productiviteit: 5, arbeidTariefOverride: 60 });
    await maak("eigen-dag", { productiviteit: 96 / 7.5, werktempoEenheid: "DAG" });
    await maak("eigen-dagdeel-met-tarief", { productiviteit: 3, werktempoEenheid: "DAGDEEL", arbeidTariefOverride: 50 });
    await maak("zonder-tempo", { productiviteit: null });
    // Een bestaande aanvraag: een momentopname die nooit uit instellingen of producten wordt herberekend.
    await db.lead.create({
      data: {
        companyId,
        toolId,
        toolNaamSnapshot: "Aanleg",
        naam: "Bestaande klant",
        email: "klant@example.nl",
        snapshot: { totaal: 1234.5, regels: [{ naam: "volgt", aantal: 41, arbeid: 205 }] },
        totaalIndicatie: 1234.5,
        idempotentieSleutel: `${sleutel}-lead`,
      },
    });
  });
  afterAll(async () => {
    await db.company.deleteMany({ where: { id: companyId } });
    await db.user.deleteMany({ where: { id: `u-${sleutel}` } });
    await db.$disconnect();
  });

  const leadSnapshot = async () => (await db.lead.findFirstOrThrow({ where: { companyId }, select: { snapshot: true, totaalIndicatie: true } }));

  it("een voorbeeld (plan) schrijft niets: annuleren laat alles ongewijzigd", async () => {
    const voor = await db.product.findMany({ where: { toolId }, orderBy: { naam: "asc" } });
    const plan = await planRekenEenheid(tx(db), companyId, toolId, "DAGDEEL");
    expect(plan?.plan.meeveranderend.map((p) => p.naam).sort()).toEqual(["volgt", "volgt-tarief", "zonder-tempo"]);
    expect(plan?.plan.behouden.map((p) => p.naam).sort()).toEqual(["eigen-dag", "eigen-dagdeel-met-tarief"]);
    expect(await db.product.findMany({ where: { toolId }, orderBy: { naam: "asc" } })).toEqual(voor);
    expect((await db.costSettings.findUniqueOrThrow({ where: { toolId } })).arbeidStapEenheid).toBe("UUR");
  });

  it("de eenheid van de rekentool wisselen: werktempo's van de volgers mee, producten met een eigen eenheid ongemoeid, prijzen gelijk, aanvragen ongewijzigd", async () => {
    const lead = await leadSnapshot();
    const voor = await prijzen();
    expect(voor.volgt).toBeGreaterThan(0);
    await db.$transaction((t) => pasRekenEenheidToe(t as unknown as Tx, companyId, toolId, "DAGDEEL"));

    const cs = await db.costSettings.findUniqueOrThrow({ where: { toolId } });
    expect(cs.arbeidStapEenheid).toBe("DAGDEEL");
    expect(cs.arbeidTariefDagdeel).toBeCloseTo(40 * 3.5, 9); // € 40 per uur bij 3,5 uur per dagdeel
    const p = Object.fromEntries((await db.product.findMany({ where: { toolId }, include: { materiaalCategorieen: { include: { materialen: true } } } })).map((x) => [x.naam, x]));
    expect(p.volgt!.productiviteit).toBeCloseTo(12 * 3.5, 9);
    expect(p.volgt!.materiaalCategorieen[0]!.materialen[0]!.productiviteitOverride).toBeCloseTo(6 * 3.5, 9);
    expect(p["volgt-tarief"]!.arbeidTariefOverride).toBeCloseTo(60 * 3.5, 9);
    expect(p["zonder-tempo"]!.productiviteit).toBeNull();
    // Met een eigen eenheid: eenheid en werktempo blijven staan.
    expect(p["eigen-dag"]!.werktempoEenheid).toBe("DAG");
    expect(p["eigen-dag"]!.productiviteit).toBeCloseTo(96 / 7.5, 12);
    expect(p["eigen-dagdeel-met-tarief"]!.werktempoEenheid).toBe("DAGDEEL");
    expect(p["eigen-dagdeel-met-tarief"]!.productiviteit).toBe(3);
    expect(p["eigen-dagdeel-met-tarief"]!.arbeidTariefOverride).toBeCloseTo(50 * 3.5, 9); // eigen tarief gaat mee naar de nieuwe eenheid

    const na = await prijzen();
    for (const naam of Object.keys(voor)) expect(na[naam], naam).toBe(voor[naam]);
    expect(await leadSnapshot()).toEqual(lead);
  });

  it("heen-en-weer wisselen van de rekentool geeft dezelfde waarden en dezelfde prijzen", async () => {
    const voor = await prijzen();
    const waarden = await db.product.findMany({ where: { toolId }, orderBy: { naam: "asc" }, select: { naam: true, productiviteit: true, arbeidTariefOverride: true } });
    for (const naar of ["DAG", "UUR", "DAGDEEL"] as const) await db.$transaction((t) => pasRekenEenheidToe(t as unknown as Tx, companyId, toolId, naar));
    const na = await prijzen();
    expect(na).toEqual(voor);
    const terug = await db.product.findMany({ where: { toolId }, orderBy: { naam: "asc" }, select: { naam: true, productiviteit: true, arbeidTariefOverride: true } });
    for (const [i, w] of waarden.entries()) {
      expect(terug[i]!.productiviteit === null ? null : terug[i]!.productiviteit).toEqual(w.productiviteit);
      expect(terug[i]!.arbeidTariefOverride).toEqual(w.arbeidTariefOverride);
    }
  });

  it("één product: eenheid en werktempo (en het werktempo per materiaal) samen; terug naar Standaard rekent terug; prijs gelijk", async () => {
    const voor = await prijzen();
    const uren = { urenPerDagdeel: 3.5, urenPerDag: 7.5 };
    // De rekentool rekent hier per dagdeel (na de vorige test): het werktempo van "volgt" staat in dagdelen.
    const huidig = await db.product.findUniqueOrThrow({ where: { id: ids.volgt! }, include: { materiaalCategorieen: { include: { materialen: true } } } });
    const materiaal = huidig.materiaalCategorieen[0]!.materialen[0]!;
    const r = await pasProductEenheidToe(db as never, companyId, ids.volgt!, {
      eenheid: "UUR",
      werktempo: convertWerktempo(huidig.productiviteit!, "DAGDEEL", "UUR", uren),
      materiaalTempos: [{ id: materiaal.id, werktempo: convertWerktempo(materiaal.productiviteitOverride!, "DAGDEEL", "UUR", uren) }],
    });
    expect(r.ok).toBe(true);
    const p = await db.product.findUniqueOrThrow({ where: { id: ids.volgt! } });
    expect(p.werktempoEenheid).toBe("UUR");
    expect(p.productiviteit).toBeCloseTo(12, 12);
    expect(await prijzen()).toEqual(voor);
    // Terug naar Standaard.
    await pasProductEenheidToe(db as never, companyId, ids.volgt!, { eenheid: null, werktempo: huidig.productiviteit, materiaalTempos: [{ id: materiaal.id, werktempo: materiaal.productiviteitOverride }] });
    const terug = await db.product.findUniqueOrThrow({ where: { id: ids.volgt! } });
    expect(terug.werktempoEenheid).toBeNull();
    expect(terug.productiviteit).toBe(huidig.productiviteit);
    expect(await prijzen()).toEqual(voor);
  });

  it("weigert een materiaal van een ander product en ongeldige waarden: dan verandert er niets", async () => {
    const vreemd = (await db.materialOption.findFirstOrThrow({ where: { materialCategory: { productId: ids["eigen-dag"]! } } })).id;
    const voor = await db.product.findUniqueOrThrow({ where: { id: ids.volgt! } });
    expect((await pasProductEenheidToe(db as never, companyId, ids.volgt!, { eenheid: "DAG", werktempo: 1, materiaalTempos: [{ id: vreemd, werktempo: 1 }] })).ok).toBe(false);
    expect((await pasProductEenheidToe(db as never, companyId, ids.volgt!, { eenheid: "DAG", werktempo: -1, materiaalTempos: [] })).ok).toBe(false);
    expect((await pasProductEenheidToe(db as never, companyId, ids.volgt!, { eenheid: "WEEK" as never, werktempo: 1, materiaalTempos: [] })).ok).toBe(false);
    expect((await pasProductEenheidToe(db as never, "andere-company", ids.volgt!, { eenheid: "DAG", werktempo: 1, materiaalTempos: [] })).ok).toBe(false);
    expect(await db.product.findUniqueOrThrow({ where: { id: ids.volgt! } })).toEqual(voor);
  });

  it("uren-definities wijzigen: producten in de eenheid van de rekentool houden hun prijs; alleen producten met een andere eigen eenheid hangen ervan af", async () => {
    const plan = await planUren(tx(db), companyId, { urenPerDagdeel: 4, urenPerDag: 8 });
    expect(plan.oud).toEqual({ urenPerDagdeel: 3.5, urenPerDag: 7.5 });
    const rakend = plan.tools[0]!.wissel.rakend.map((r) => r.naam).sort();
    // De rekentool rekent per dagdeel: "eigen-dag" rekent in een andere eenheid; "eigen-dagdeel-met-tarief" in dezelfde.
    expect(rakend).toEqual(["eigen-dag"]);
  });

  it("uren-definities 'prijs gelijk houden': ook producten met een andere eigen eenheid houden hun prijs; 'meebewegen' laat hun werktempo staan", async () => {
    const voor = await prijzen();
    const tempoVoor = (await db.product.findUniqueOrThrow({ where: { id: ids["eigen-dag"]! } })).productiviteit;
    await pasUrenToe(db as never, companyId, { urenPerDagdeel: 4, urenPerDag: 8 }, "gelijk");
    expect(await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { urenPerDagdeel: true, urenPerDag: true } })).toEqual({ urenPerDagdeel: 4, urenPerDag: 8 });
    expect(await prijzen()).toEqual(voor);
    expect((await db.product.findUniqueOrThrow({ where: { id: ids["eigen-dag"]! } })).productiviteit).not.toBe(tempoVoor);
    // De bestaande aanvraag is ongemoeid.
    expect((await leadSnapshot()).totaalIndicatie).toBe(1234.5);

    // Terug naar 3,5 en 7,5, nu zonder aanpassen: de prijs van het product met een andere eigen eenheid beweegt mee, de rest niet.
    const tempoNa = (await db.product.findUniqueOrThrow({ where: { id: ids["eigen-dag"]! } })).productiviteit;
    await pasUrenToe(db as never, companyId, { urenPerDagdeel: 3.5, urenPerDag: 7.5 }, "meebewegen");
    expect((await db.product.findUniqueOrThrow({ where: { id: ids["eigen-dag"]! } })).productiviteit).toBe(tempoNa);
    const na = await prijzen();
    expect(na["eigen-dag"]).not.toBe(voor["eigen-dag"]);
    for (const naam of ["volgt", "volgt-tarief", "eigen-dagdeel-met-tarief"]) expect(na[naam], naam).toBe(voor[naam]);
  });
});
