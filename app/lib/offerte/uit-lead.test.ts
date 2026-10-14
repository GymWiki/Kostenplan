import { describe, expect, it } from "vitest";
import { bouwOfferteUitLead } from "./uit-lead";
import { berekenTotalen } from "./bereken";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { CalcCostSettings } from "@/app/lib/calculate";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import { configVanProducten, invoerVanKlant } from "@/app/lib/pricing/adapters";
import { berekenPrijs } from "@/app/lib/pricing/engine";
import { optie, product, type TestProduct } from "@/app/lib/pricing/test-helpers";
import type { OfferteInhoud } from "./model";

// Regressie €0-regel: een lead wordt omgezet naar een offerte met per onderdeel
// een sectie en losse regels (materiaal, arbeid, transport, voorrijkosten,
// extra's) met de échte prijs per eenheid. Nooit een bedragregel op €0 en nooit
// één samengevoegde regel "Materiaal- en overige kosten".
const snapshotMetOpbouw: LeadSnapshot = {
  regels: [
    {
      naam: "Schutting",
      type: "product",
      aantal: 20,
      eenheid: "m1",
      materiaal: "Douglas",
      prijs: 2400,
      opbouw: {
        materiaal: [{ naam: "Douglas schutting", hoeveelheid: 20, eenheid: "m1", prijsPerEenheid: 85, bedrag: 1700 }],
        arbeid: { tijd: 8, eenheid: "uur", tarief: 55, bedrag: 440 },
        transport: { bedrag: 60, meeschalend: false },
        voorrijkosten: { bedrag: 35, meeschalend: false },
        extras: [{ naam: "Extra sterke scharnieren", aantal: 1, bedrag: 165 }],
      },
    },
  ],
  arbeidskosten: 440,
  materiaalkosten: 1865,
  transportkosten: 60,
  voorrijkosten: 35,
  subtotaal: 2500,
  btw: 525,
  totaal: 3025,
};

describe("bouwOfferteUitLead (regressie €0-regel)", () => {
  it("maakt losse regels met echte prijzen en nooit een restpost", () => {
    const o = bouwOfferteUitLead(snapshotMetOpbouw);
    const regels = o.secties.flatMap((s) => s.regels);
    // Eén sectie voor het onderdeel + één voor voorrijkosten en transport (één keer per offerte).
    expect(o.secties).toHaveLength(2);
    expect(o.secties[0].titel).toMatch(/Schutting/);
    expect(o.secties[1].titel).toBe("Voorrijkosten en transport");
    expect(regels.some((r) => /Materiaal- en overige kosten/.test(r.omschrijving))).toBe(false);
    expect(regels.filter((r) => r.type !== "tekst").every((r) => r.prijsCenten > 0)).toBe(true);
    const materiaal = regels.find((r) => /Douglas/.test(r.omschrijving))!;
    expect(materiaal.aantal).toBe(20);
    expect(materiaal.prijsCenten).toBe(8500);
    const arbeid = regels.find((r) => r.omschrijving === "Arbeid")!;
    expect(arbeid).toMatchObject({ aantal: 8, eenheid: "uur", prijsCenten: 5500 });
  });

  it("valt voor oude snapshots zonder opbouw terug op één echte regel per onderdeel (geen €0)", () => {
    const oud: LeadSnapshot = { ...snapshotMetOpbouw, regels: [{ naam: "Terras", type: "product", aantal: 90, eenheid: "m2", prijs: 3600 }], subtotaal: 3600 };
    const regels = bouwOfferteUitLead(oud).secties.flatMap((s) => s.regels);
    expect(regels).toHaveLength(1);
    expect(regels[0].prijsCenten).toBe(4000);
  });

  it("maakt voor een snapshot met alleen kloppende totalen losse regels per kostensoort", () => {
    const alleenTotalen: LeadSnapshot = { ...snapshotMetOpbouw, subtotaal: 2400, regels: [{ naam: "Schutting", type: "product", aantal: 20, eenheid: "m1" }] };
    const regels = bouwOfferteUitLead(alleenTotalen).secties.flatMap((s) => s.regels);
    expect(regels.map((r) => [r.omschrijving, r.prijsCenten])).toEqual([["Materiaal", 186500], ["Arbeid", 44000], ["Transport", 6000], ["Voorrijkosten", 3500]]);
  });

  it("schat de prijs (met waarschuwing) als een regel geen prijs heeft, nooit €0", () => {
    const zonderPrijs: LeadSnapshot = { ...snapshotMetOpbouw, regels: [{ naam: "Terras", type: "product", aantal: 10, eenheid: "m2" }], subtotaal: 1000, btw: 210, totaal: 1210 };
    const o = bouwOfferteUitLead(zonderPrijs);
    expect(o.secties.flatMap((s) => s.regels)[0].prijsCenten).toBe(10000);
    expect(o.waarschuwingen.join(" ")).toMatch(/schatting/);
  });
});

// ── Het offertetotaal is gelijk aan het totaal dat de klant in de rekentool zag: exact ──

const kosten: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTariefUur: 55,
  arbeidTariefDagdeel: 180,
  arbeidTariefDag: 340,
  arbeidAfronden: false,
  transportEnabled: true,
  transportTarief: 60,
  voorrijEnabled: true,
  voorrijTarief: 35,
  materiaalEnabled: true,
  btwPercentage: 21,
  bandbreedteModus: "GEEN",
  bandbreedteMargeOmlaag: 0,
  bandbreedteMargeOmhoog: 0,
};

type P = TestProduct;

function offerteTotaal(products: P[], invoerArgs: { hoeveelheden?: Record<string, number>; sjabloonInvoer?: Record<string, Record<string, unknown>>; materiaalKeuzes?: Record<string, string>; extraKeuzes?: Record<string, number> }, k: CalcCostSettings = kosten, opties: { btwStandaard?: Record<string, number> } = {}) {
  const config = configVanProducten(products, k);
  const invoer = invoerVanKlant({ producten: products, ...invoerArgs });
  const resultaat = berekenPrijs(config, invoer);
  const snapshot = bouwLeadSnapshot({ config, invoer, resultaat });
  const o = bouwOfferteUitLead(snapshot, opties);
  const inhoud = { secties: o.secties, klant: { type: "particulier" }, afzender: { korActief: false }, rekenregel: 2 } as Pick<OfferteInhoud, "secties" | "klant" | "afzender" | "rekenregel">;
  const t = berekenTotalen(inhoud);
  const regels = o.secties.flatMap((s) => s.regels);
  return { t, o, rekentool: o.totaalRekentoolInclCenten, klant: resultaat.totaalInclCenten, regels };
}

describe("offertetotaal = totaal in de rekentool", () => {
  const cases: { naam: string; products: P[]; invoer: Parameters<typeof offerteTotaal>[1]; k?: CalcCostSettings }[] = [
    {
      naam: "per meter (schutting), één materiaalcategorie",
      products: [product({ id: "a", naam: "Schutting", eenheid: "m1", productiviteit: 8, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Douglas", 85.5)] }] })],
      invoer: { hoeveelheden: { a: 20 } },
    },
    {
      naam: "per m² (bestrating) met twee materiaalcategorieën en stapgrootte",
      products: [
        product({
          id: "b",
          naam: "Bestrating",
          eenheid: "m2",
          productiviteit: 7,
          materiaalCategorieen: [
            { id: "c1", naam: "Tegel", materialen: [optie("t1", "Klinker", 48.75), optie("t2", "Betontegel", 32)] },
            { id: "c2", naam: "Zand", materialen: [optie("z1", "Straatzand", 6.4, { stapgrootte: 2 })] },
          ],
        }),
      ],
      invoer: { hoeveelheden: { b: 37.5 }, materiaalKeuzes: { c1: "t1" } },
    },
    {
      naam: "gazon met extra's per eenheid en per stuk, transport meeschalend",
      products: [
        product({
          id: "g",
          naam: "Graszoden",
          eenheid: "m2",
          productiviteit: 25,
          transportMeeschalend: true,
          materiaalCategorieen: [{ id: "c1", naam: "Zoden", materialen: [optie("g1", "Sportgazon", 9.5)] }],
          extraOpties: [
            { id: "e1", naam: "Bemesting", prijs: 1.25, type: "PER_EENHEID" },
            { id: "e2", naam: "Beregeningsset", prijs: 49.9, type: "PER_STUK" },
          ],
        }),
      ],
      invoer: { hoeveelheden: { g: 6 * 4.5 }, extraKeuzes: { e1: 1, e2: 2 } },
    },
    {
      naam: "per stuk (lantaarn plaatsen) met toeslag en eigen arbeidstarief",
      products: [
        product({
          id: "p",
          naam: "Lantaarn plaatsen",
          eenheid: "stuks",
          productiviteit: 1.5,
          arbeidTariefOverride: 150,
          voorrijkostenOverride: 25,
          materiaalCategorieen: [{ id: "c1", naam: "Boom", materialen: [optie("b1", "Linde", 189), optie("b2", "Els", 140)] }],
          extraOpties: [{ id: "t1", naam: "Afvoer", prijs: 45, altijd: true, type: "PER_STUK" }],
        }),
      ],
      invoer: { hoeveelheden: { p: 3 }, materiaalKeuzes: { c1: "b1" } },
    },
    {
      naam: "meerdere onderdelen: voorrijkosten en transport",
      products: [
        product({ id: "a", naam: "Schutting", eenheid: "m1", productiviteit: 8, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Douglas", 85)] }] }),
        product({ id: "b", naam: "Terras", eenheid: "m2", productiviteit: 6, materiaalCategorieen: [{ id: "c2", naam: "Tegel", materialen: [optie("t1", "Klinker", 45)] }] }),
      ],
      invoer: { hoeveelheden: { a: 14, b: 22 } },
    },
    {
      naam: "arbeid afronden op hele dagdelen en transport per dag",
      products: [product({ id: "a", naam: "Vlonder", eenheid: "m2", productiviteit: 3, transportPerDag: true, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Hardhout", 120)] }] })],
      invoer: { hoeveelheden: { a: 10 } },
      k: { ...kosten, arbeidAfronden: true },
    },
    {
      naam: "lengte × breedte met een prijs met een deel van een cent per eenheid",
      products: [product({ id: "l", naam: "Gazon", eenheid: "m2", sjabloon: "AFMETINGEN", sjabloonConfig: { metDiepte: false }, productiviteit: 17, materiaalCategorieen: [{ id: "c1", naam: "Zoden", materialen: [optie("z", "Zoden", 12.345)] }] })],
      invoer: { sjabloonInvoer: { l: { lengte: 7.3, breedte: 4.1 } } },
    },
    {
      naam: "artikelregels (sjabloon Per stuk): elk artikeltype een eigen regel",
      products: [
        product({
          id: "r",
          naam: "Verlichting",
          eenheid: "stuks",
          sjabloon: "ARTIKELREGELS",
          sjabloonConfig: { artikelTypes: [{ id: "spot", naam: "Grondspot", prijsPerEenheid: 63.5, berekening: "stuk" }, { id: "paal", naam: "Tuinpaal", prijsPerEenheid: 118.75, berekening: "stuk" }] },
          productiviteit: null,
          materiaalCategorieen: [],
        }),
      ],
      invoer: { sjabloonInvoer: { r: { regels: [{ artikelTypeId: "spot", aantal: 7, breedte: 0, hoogte: 0 }, { artikelTypeId: "paal", aantal: 3, breedte: 0, hoogte: 0 }] } } },
    },
  ];

  for (const c of cases) {
    it(c.naam, () => {
      const r = offerteTotaal(c.products, c.invoer, c.k);
      expect(r.regels.length).toBeGreaterThan(1);
      expect(r.regels.every((x) => x.prijsCenten > 0)).toBe(true);
      expect(r.regels.some((x) => /Materiaal- en overige kosten/.test(x.omschrijving))).toBe(false);
      // Exact gelijk aan wat de klant zag, tot op de cent.
      expect(r.t.totaalIncl).toBe(r.klant);
      expect(r.t.totaalIncl).toBe(r.rekentool);
    });
  }

  it("de offerte volgt het btw-tarief van de rekentool; een eigen instelling in het Profiel gaat voor", () => {
    const p = product({ id: "h", naam: "Haag planten", eenheid: "m1", productiviteit: 12, materiaalCategorieen: [{ id: "c1", naam: "Planten", materialen: [optie("h1", "Beuk", 18)] }] });
    const r = offerteTotaal([p], { hoeveelheden: { h: 10 } });
    const beuk = r.regels.find((x) => /Beuk/.test(x.omschrijving))!;
    expect(beuk.soort).toBe("planten");
    expect(r.regels.every((x) => x.btw === 21)).toBe(true);
    expect(r.t.totaalIncl).toBe(r.klant);
    // Wel een melding: planten vallen vaak onder 9%.
    expect(r.o.waarschuwingen.join(" ")).toMatch(/9%/);
    // Met een eigen instelling (planten 9%) volgt de offerte die instelling.
    const p2 = offerteTotaal([p], { hoeveelheden: { h: 10 } }, kosten, { btwStandaard: { planten: 9 } });
    expect(p2.regels.find((x) => /Beuk/.test(x.omschrijving))!.btw).toBe(9);
    expect(p2.regels.find((x) => x.omschrijving === "Arbeid")!.btw).toBe(21);
  });

  it("bandbreedte: gebruikt het midden en meldt dit aan de hovenier", () => {
    const k: CalcCostSettings = { ...kosten, bandbreedteModus: "PER_PRODUCT" };
    const p = product({ id: "a", naam: "Terras", eenheid: "m2", productiviteit: 6, materiaalCategorieen: [{ id: "c1", naam: "Tegel", materialen: [optie("t1", "Klinker", 45, { prijsType: "BANDBREEDTE" as never, prijsMin: 40, prijsMax: 50 })] }] });
    const r = offerteTotaal([p], { hoeveelheden: { a: 10 } }, k);
    expect(r.o.bandbreedte).toBe(true);
    expect(r.o.waarschuwingen.join(" ")).toMatch(/midden/);
    expect(r.regels.find((x) => /Klinker/.test(x.omschrijving))!.prijsCenten).toBe(4500);
  });
});

describe("minimumtarief in de offerte", () => {
  const producten: P[] = [product({ id: "a", naam: "Schutting", eenheid: "m1", productiviteit: 8, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Douglas", 12.5)] }] })];

  it("de minimumaanvulling is een eigen regel 'Aanvulling tot minimumtarief' (niet bij Transport) en het totaal is precies het minimum", async () => {
    const { stelMinimumExactIn } = await import("./minimum");
    const config = { ...configVanProducten(producten, kosten), minimum: { aan: true, bedragInclCenten: 150000, gedrag: "TARIEF" as const } };
    const invoer = invoerVanKlant({ producten, hoeveelheden: { a: 10 } });
    const resultaat = berekenPrijs(config, invoer);
    expect(resultaat.totaalInclCenten).toBe(150000);
    const o = bouwOfferteUitLead(bouwLeadSnapshot({ config, invoer, resultaat }));
    const regels = o.secties.flatMap((s) => s.regels);
    expect(regels.filter((r) => r.omschrijving === "Aanvulling tot minimumtarief")).toHaveLength(1);
    expect(regels.filter((r) => /^Transport/.test(r.omschrijving)).every((r) => !/minimum/i.test(r.omschrijving))).toBe(true);
    expect(o.minimumInclCenten).toBe(150000);
    const basis = { secties: o.secties, klant: { type: "particulier" }, afzender: { korActief: false }, rekenregel: 3 } as unknown as OfferteInhoud;
    expect(berekenTotalen(stelMinimumExactIn(basis, o.minimumInclCenten!)).totaalIncl).toBe(150000);
  });
});
