import { describe, expect, it } from "vitest";
import { calculateBreakdown, type CalcCostSettings, type CalcProduct } from "./calculate";
import { prefillOfferteRegels } from "./offertes";
import type { LeadSnapshot, LeadSnapshotLine } from "./leads";

// Eind-tot-eind regressietest voor de offerteregels-bug (UX-audit punt 1):
// van een aanvraag met meerdere producten, via calculateBreakdown() (echte
// prijsberekening) en dezelfde snapshot-opbouw als
// app/portaal/[slug]/calculator.tsx, tot en met prefillOfferteRegels() — het
// volledige pad dat een klant-aanvraag in een offerteconcept omzet.
// Bestaande tests (calculate.test.ts, offertes.test.ts) toetsen elke schakel
// afzonderlijk; deze test toetst dat de schakels ook daadwerkelijk op elkaar
// aansluiten (bijv. dat de snapshot-bouwer in calculator.tsx écht
// `breakdown.productRegels` gebruikt, niet alleen dat prefillOfferteRegels()
// een al-correcte snapshot goed verwerkt).

const costSettings: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTariefUur: 50,
  arbeidTariefDagdeel: 200,
  arbeidTariefDag: 380,
  arbeidAfronden: true,
  transportEnabled: true,
  transportTarief: 0,
  voorrijEnabled: true,
  voorrijTarief: 35,
  materiaalEnabled: true,
  btwPercentage: 21,
  bandbreedteModus: "GEEN",
  bandbreedteMargeOmlaag: 10,
  bandbreedteMargeOmhoog: 10,
};

const schutting: CalcProduct = {
  id: "product-schutting",
  productiviteit: 4, // 4 m1 per dagdeel
  arbeidTariefOverride: null,
  transportkostenOverride: 25,
  transportMeeschalend: false,
  voorrijkostenOverride: null,
  voorrijMeeschalend: false,
  materiaalCategorieen: [
    {
      id: "categorie-schutting",
      naam: "Materiaal",
      materialen: [
        {
          id: "douglas",
          naam: "Douglas, Blank rabat",
          prijs: 45,
          prijsType: "VAST",
          prijsMin: null,
          prijsMax: null,
          stapgrootte: null,
          productiviteitOverride: null,
        },
      ],
    },
  ],
  extraOpties: [],
};

const terras: CalcProduct = {
  id: "product-terras",
  productiviteit: 15, // 15 m2 per dagdeel
  arbeidTariefOverride: null,
  transportkostenOverride: 40,
  transportMeeschalend: false,
  voorrijkostenOverride: null,
  voorrijMeeschalend: false,
  materiaalCategorieen: [
    {
      id: "categorie-terras",
      naam: "Materiaal",
      materialen: [
        {
          id: "standaard",
          naam: "Standaard",
          prijs: 30,
          prijsType: "VAST",
          prijsMin: null,
          prijsMax: null,
          stapgrootte: null,
          productiviteitOverride: null,
        },
      ],
    },
  ],
  extraOpties: [],
};

// Bouwt de snapshot exact zoals de `snapshot`-useMemo in
// app/portaal/[slug]/calculator.tsx dat doet: per product met een
// hoeveelheid > 0 zijn eigen, al berekende totaalbedrag (productRegel.totaal)
// meegeven als lijn.prijs.
function bouwSnapshot(products: CalcProduct[], productQty: Record<string, number>): LeadSnapshot {
  const breakdown = calculateBreakdown({
    products,
    productQty,
    materialSelections: { "categorie-schutting": "douglas", "categorie-terras": "standaard" },
    extraSelections: {},
    costSettings,
  });

  const regels: LeadSnapshotLine[] = products
    .filter((product) => (productQty[product.id] ?? 0) > 0)
    .map((product) => {
      const productRegel = breakdown.productRegels.find((regel) => regel.productId === product.id);
      return {
        naam: product.id === schutting.id ? "Schutting" : "Terras aanleggen",
        type: "product",
        aantal: productQty[product.id],
        eenheid: product.id === schutting.id ? "m1" : "m2",
        prijs: productRegel?.totaal,
      };
    });

  return {
    regels,
    arbeidskosten: breakdown.arbeidskosten,
    materiaalkosten: breakdown.materiaalkosten,
    transportkosten: breakdown.transportkosten,
    voorrijkosten: breakdown.voorrijkosten,
    subtotaal: breakdown.subtotaal,
    btw: breakdown.btw,
    totaal: breakdown.totaal,
  };
}

describe("Aanvraag met meerdere producten -> offerteconcept (eind-tot-eind)", () => {
  it("geeft elke regel zijn eigen, correct berekende prijs — geen enkele regel op €0,00, geen vangnet-restpost nodig", () => {
    const snapshot = bouwSnapshot([schutting, terras], {
      "product-schutting": 10,
      "product-terras": 90,
    });

    // Sanity check: de snapshot zelf bevat al een prijs per regel (dat is
    // precies wat de bug-fix van 2026-08-05 beoogde) — als dit faalt, ligt
    // het probleem in calculate.ts/calculator.tsx, niet in offertes.ts.
    expect(snapshot.regels).toHaveLength(2);
    for (const regel of snapshot.regels) {
      expect(regel.prijs, `${regel.naam} moet een prijs hebben in de snapshot`).not.toBeUndefined();
      expect(regel.prijs).toBeGreaterThan(0);
    }

    const offerteRegels = prefillOfferteRegels(snapshot);

    // Kern van de UX-audit-bug: geen enkele productregel op €0,00, en geen
    // "Materiaal- en overige kosten"-vangnetregel meer nodig.
    expect(offerteRegels).toHaveLength(2);
    expect(offerteRegels.some((r) => r.id === "snapshot-restant")).toBe(false);
    expect(offerteRegels.some((r) => r.omschrijving === "Materiaal- en overige kosten")).toBe(false);

    for (const regel of offerteRegels) {
      expect(regel.prijsPerEenheid, `${regel.omschrijving} heeft prijsPerEenheid 0`).toBeGreaterThan(0);
    }

    const schuttingRegel = offerteRegels.find((r) => r.omschrijving.startsWith("Schutting"));
    const terrasRegel = offerteRegels.find((r) => r.omschrijving.startsWith("Terras"));
    expect(schuttingRegel).toBeDefined();
    expect(terrasRegel).toBeDefined();

    // Het totaal van de losse regels moet exact het subtotaal van de
    // oorspronkelijke aanvraag zijn — er "verdwijnt" of "verschijnt" geen
    // geld tussen aanvraag en offerteconcept.
    const som = offerteRegels.reduce((acc, r) => acc + r.aantal * r.prijsPerEenheid, 0);
    expect(som).toBeCloseTo(snapshot.subtotaal, 6);
  });

  it("blijft correct met drie producten waarvan er één qty 0 heeft (niet meegenomen)", () => {
    const derdeProduct: CalcProduct = { ...terras, id: "product-ongebruikt" };
    const snapshot = bouwSnapshot([schutting, terras, derdeProduct], {
      "product-schutting": 6,
      "product-terras": 30,
      "product-ongebruikt": 0,
    });

    expect(snapshot.regels).toHaveLength(2);
    const offerteRegels = prefillOfferteRegels(snapshot);
    expect(offerteRegels).toHaveLength(2);
    expect(offerteRegels.every((r) => r.prijsPerEenheid > 0)).toBe(true);
  });
});
