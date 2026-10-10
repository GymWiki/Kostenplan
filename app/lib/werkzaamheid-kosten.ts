import {
  arbeidTariefVoorStapEenheid,
  calculateBreakdown,
  dagenVoorArbeidstijd,
  type CalcCostSettings,
} from "@/app/lib/calculate";
import type { PreviewProduct } from "@/app/lib/werkzaamheid";

// De kostenopbouw "alleen voor jou" voor één werkzaamheid en één gekozen
// materiaal — uitsluitend uit de echte rekenlogica (calculateBreakdown), zodat
// dit nooit afwijkt van wat een klant te zien krijgt. Gedeeld door het
// bewerkscherm, de wizard en het overzicht.
export type KostenOpbouw = {
  hoeveelheid: number;
  materiaal: number;
  arbeid: number;
  // Aantal arbeidseenheden (dagdelen/dagen/uren) dat de arbeid kost.
  arbeidstijd: number;
  arbeidTarief: number;
  transport: number;
  // Alleen bij "transport per dag": aantal begonnen dagen.
  transportDagen: number | null;
  voorrijkosten: number;
  // Excl. btw — hovenierstarieven zijn al inclusief marge, btw komt er in de
  // klant-rekentool apart bij.
  totaal: number;
};

export function berekenKostenOpbouw({
  product,
  optieId,
  hoeveelheid,
  costSettings,
}: {
  product: PreviewProduct;
  optieId: string | null;
  hoeveelheid: number;
  costSettings: CalcCostSettings;
}): KostenOpbouw {
  const categorie = product.materiaalCategorieen[0];
  const gekozen = categorie?.materialen.find((m) => m.id === optieId) ?? categorie?.materialen[0];
  const selecties: Record<string, string> = {};
  for (const [i, c] of product.materiaalCategorieen.entries()) {
    const keuze = i === 0 ? gekozen : c.materialen[0];
    if (keuze) selecties[c.id] = keuze.id;
  }

  const b = calculateBreakdown({
    products: [product],
    productQty: { [product.id]: hoeveelheid },
    materialSelections: selecties,
    extraSelections: {},
    costSettings,
  });

  const tempo = gekozen?.productiviteitOverride ?? product.productiviteit;
  const arbeidstijd = tempo && tempo > 0 && hoeveelheid > 0 ? hoeveelheid / tempo : 0;
  const transportDagen =
    product.transportPerDag && arbeidstijd > 0
      ? Math.max(1, Math.ceil(Math.round(dagenVoorArbeidstijd(arbeidstijd, costSettings.arbeidStapEenheid) * 1e6) / 1e6))
      : null;

  return {
    hoeveelheid,
    materiaal: b.materiaalkosten,
    arbeid: b.arbeidskosten,
    arbeidstijd,
    arbeidTarief:
      product.arbeidTariefOverride ?? arbeidTariefVoorStapEenheid(costSettings, costSettings.arbeidStapEenheid),
    transport: b.transportkosten,
    transportDagen,
    voorrijkosten: b.voorrijkosten,
    totaal: b.subtotaal,
  };
}

// Prijsrange per eenheid over alle materialen (voor de overzichtskaart).
export function prijsRange(product: PreviewProduct): { min: number; max: number } | null {
  const prijzen = (product.materiaalCategorieen[0]?.materialen ?? []).flatMap((m) =>
    m.prijsType === "BANDBREEDTE" && m.prijsMin != null && m.prijsMax != null ? [m.prijsMin, m.prijsMax] : [m.prijs]
  );
  if (prijzen.length === 0) return null;
  return { min: Math.min(...prijzen), max: Math.max(...prijzen) };
}
