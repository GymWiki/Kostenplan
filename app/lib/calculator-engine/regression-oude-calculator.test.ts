import { describe, expect, it } from "vitest";
import { berekenProductKosten, calculateBreakdown, type CalcCostSettings, type CalcProduct } from "@/app/lib/calculate";
import { bouwScope, evaluatePriceRules, bouwResultaat } from "./index";
import type { CalculatorResultSettings, Expression, PriceRule } from "./types";

// ---------------------------------------------------------------------------
// Fase 12 (Deel 22/43 van de opdracht) — regressietest: bewijst dat de
// nieuwe, generieke engine voor equivalente configuraties EXACT dezelfde
// uitkomst geeft als de bestaande, sjabloon-gedreven calculator
// (calculate.ts). Dit is geen migratie van bestaande tools (die blijven
// gewoon op het oude pad draaien, zie Deel 20/31) — het is het bewijs dat de
// nieuwe engine, wanneer je 'm hetzelfde vraagt, niet stiekem een andere
// prijs oplevert. Voor elk scenario: bouw dezelfde situatie op in beide
// systemen, reken door, en vergelijk het eindtotaal (incl. btw) op de cent
// nauwkeurig.
// ---------------------------------------------------------------------------

const geenAfrondingResultaatInstellingen: CalculatorResultSettings = {
  weergave: "EXACT",
  afronding: "GEEN",
  ctaType: "OFFERTE_AANVRAGEN",
  ctaTekst: null,
  toelichting: null,
  bandbreedteMargeOmlaag: 10,
  bandbreedteMargeOmhoog: 10,
};

const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });
const variabele = (naam: string): Expression => ({ kind: "VARIABELE", naam });

function basisRegel(overrides: Partial<PriceRule> & Pick<PriceRule, "id" | "type" | "categorie">) {
  return {
    label: overrides.id,
    actief: true,
    toonInUitsplitsing: true,
    intern: false,
    ...overrides,
  } as PriceRule;
}

describe("Regressie: nieuwe engine == oude calculator (Deel 43)", () => {
  it("scenario 1: één product, vaste hoeveelheid, geen meeschalende posten", () => {
    const costSettings: CalcCostSettings = {
      arbeidEnabled: true,
      arbeidStapEenheid: "UUR",
      arbeidTariefUur: 45,
      arbeidTariefDagdeel: 180,
      arbeidTariefDag: 360,
      arbeidAfronden: false,
      transportEnabled: true,
      transportTarief: 25,
      voorrijEnabled: true,
      voorrijTarief: 35,
      materiaalEnabled: true,
      btwPercentage: 21,
      bandbreedteModus: "GEEN",
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    };
    const product: CalcProduct = {
      id: "product-1",
      productiviteit: 10,
      arbeidTariefOverride: null,
      transportkostenOverride: null,
      transportMeeschalend: false,
      voorrijkostenOverride: null,
      voorrijMeeschalend: false,
      materiaalCategorieen: [
        {
          id: "cat-1",
          naam: "Materiaal",
          materialen: [
            { id: "m-1", naam: "Materiaal A", prijs: 20, prijsType: "VAST", prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null },
          ],
        },
      ],
      extraOpties: [],
    };

    const hoeveelheid = 24;
    const oud = calculateBreakdown({
      products: [product],
      productQty: { "product-1": hoeveelheid },
      materialSelections: {},
      extraSelections: {},
      costSettings,
    });

    const nieuweVelden = [{ id: "lengte", label: "Lengte", soort: "NUMMER" as const, verplicht: true }];
    const nieuweRegels: PriceRule[] = [
      basisRegel({
        id: "materiaal",
        type: "PER_EENHEID",
        categorie: "MATERIAAL",
        hoeveelheid: variabele("lengte"),
        prijsPerEenheid: getal(20),
        eenheid: "meter",
      }),
      basisRegel({
        id: "arbeid",
        type: "PER_EENHEID",
        categorie: "ARBEID",
        hoeveelheid: { kind: "DELEN", links: variabele("lengte"), rechts: getal(10) },
        prijsPerEenheid: getal(45),
        eenheid: "uur",
      }),
      basisRegel({ id: "transport", type: "VAST", categorie: "TRANSPORT", bedrag: getal(25) }),
      basisRegel({ id: "voorrij", type: "VAST", categorie: "OVERIG", bedrag: getal(35) }),
    ];

    const scope = bouwScope(nieuweVelden, { lengte: hoeveelheid });
    const evaluatie = evaluatePriceRules(nieuweRegels, scope);
    const nieuw = bouwResultaat(evaluatie, {
      btwPercentage: costSettings.btwPercentage,
      resultaatInstellingen: geenAfrondingResultaatInstellingen,
      heeftGeldigeInvoer: true,
    });

    expect(nieuw.subtotaal).toBeCloseTo(oud.subtotaal, 6);
    expect(nieuw.btw).toBeCloseTo(oud.btw, 6);
    expect(nieuw.totaal).toBeCloseTo(oud.totaal, 6);
    // Concreet getal ter documentatie: 24×20 + (24/10)×45 + 25 + 35 = 648,
    // ×1,21 btw = 784,08.
    expect(nieuw.totaal).toBeCloseTo(784.08, 2);
  });

  it("scenario 2: meeschalend transport + hogere hoeveelheid", () => {
    const costSettings: CalcCostSettings = {
      arbeidEnabled: true,
      arbeidStapEenheid: "UUR",
      arbeidTariefUur: 50,
      arbeidTariefDagdeel: 200,
      arbeidTariefDag: 380,
      arbeidAfronden: false,
      transportEnabled: true,
      transportTarief: 3,
      voorrijEnabled: false,
      voorrijTarief: 0,
      materiaalEnabled: true,
      btwPercentage: 21,
      bandbreedteModus: "GEEN",
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    };
    const product: CalcProduct = {
      id: "product-1",
      productiviteit: 8,
      arbeidTariefOverride: null,
      transportkostenOverride: null,
      transportMeeschalend: true,
      voorrijkostenOverride: null,
      voorrijMeeschalend: false,
      materiaalCategorieen: [
        {
          id: "cat-1",
          naam: "Materiaal",
          materialen: [
            { id: "m-1", naam: "Materiaal A", prijs: 35, prijsType: "VAST", prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null },
          ],
        },
      ],
      extraOpties: [],
    };

    const hoeveelheid = 60;
    const oud = calculateBreakdown({
      products: [product],
      productQty: { "product-1": hoeveelheid },
      materialSelections: {},
      extraSelections: {},
      costSettings,
    });

    const nieuweVelden = [{ id: "oppervlakte", label: "Oppervlakte", soort: "OPPERVLAKTE" as const, verplicht: true }];
    const nieuweRegels: PriceRule[] = [
      basisRegel({
        id: "materiaal",
        type: "PER_EENHEID",
        categorie: "MATERIAAL",
        hoeveelheid: variabele("oppervlakte"),
        prijsPerEenheid: getal(35),
        eenheid: "m2",
      }),
      basisRegel({
        id: "arbeid",
        type: "PER_EENHEID",
        categorie: "ARBEID",
        hoeveelheid: { kind: "DELEN", links: variabele("oppervlakte"), rechts: getal(8) },
        prijsPerEenheid: getal(50),
        eenheid: "uur",
      }),
      // meeschalend transport = hoeveelheid x tarief
      basisRegel({
        id: "transport",
        type: "PER_EENHEID",
        categorie: "TRANSPORT",
        hoeveelheid: variabele("oppervlakte"),
        prijsPerEenheid: getal(3),
        eenheid: "m2",
      }),
    ];

    const scope = bouwScope(nieuweVelden, { oppervlakte: hoeveelheid });
    const evaluatie = evaluatePriceRules(nieuweRegels, scope);
    const nieuw = bouwResultaat(evaluatie, {
      btwPercentage: costSettings.btwPercentage,
      resultaatInstellingen: geenAfrondingResultaatInstellingen,
      heeftGeldigeInvoer: true,
    });

    expect(nieuw.subtotaal).toBeCloseTo(oud.subtotaal, 6);
    expect(nieuw.btw).toBeCloseTo(oud.btw, 6);
    expect(nieuw.totaal).toBeCloseTo(oud.totaal, 6);
  });

  it("scenario 3: berekenProductKosten (de gedeelde formule) komt overeen met een PER_EENHEID + VAST-combinatie", () => {
    const kosten = berekenProductKosten({
      materiaalkosten: 500,
      materiaalEnabled: true,
      hoeveelheid: 12,
      productiviteit: 6,
      arbeidTarief: 40,
      arbeidEnabled: true,
      arbeidAfronden: false,
      transportBedrag: 15,
      transportMeeschalend: false,
      transportEnabled: true,
      voorrijBedrag: 0,
      voorrijMeeschalend: false,
      voorrijEnabled: false,
    });

    const scope = bouwScope([{ id: "aantal", label: "Aantal", soort: "AANTAL", verplicht: true }], { aantal: 12 });
    const regels: PriceRule[] = [
      basisRegel({ id: "materiaal", type: "VAST", categorie: "MATERIAAL", bedrag: getal(500) }),
      basisRegel({
        id: "arbeid",
        type: "PER_EENHEID",
        categorie: "ARBEID",
        hoeveelheid: { kind: "DELEN", links: variabele("aantal"), rechts: getal(6) },
        prijsPerEenheid: getal(40),
        eenheid: "uur",
      }),
      basisRegel({ id: "transport", type: "VAST", categorie: "TRANSPORT", bedrag: getal(15) }),
    ];
    const { subtotaal } = evaluatePriceRules(regels, scope);

    expect(subtotaal).toBeCloseTo(kosten.totaal, 6);
  });
});
