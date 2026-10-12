import type { PricingResult, Samenvatting } from "./engine";

// Vertaalt het resultaat van de rekenkern (centen) naar de bedragen in euro's die de
// klant-rekentool toont: per kostenblok een bedrag of een van–tot-bereik.

export type Bedrag = number | { min: number; max: number };

export type BreakdownRange = {
  modus: "GEEN" | "PER_PRODUCT" | "TOTAAL";
  arbeidskosten: Bedrag;
  // Materiaal inclusief extra's, toeslagen en artikelregels (alles wat geen arbeid of vaste kosten is).
  materiaalkosten: Bedrag;
  transportkosten: Bedrag;
  voorrijkosten: Bedrag;
  subtotaal: Bedrag;
  btw: Bedrag;
  totaal: Bedrag;
  heeftSelectie: boolean;
  margeOmlaag?: number;
  margeOmhoog?: number;
  // Per onderdeel: het midden-scenario in euro's, ook bij een bandbreedte.
  onderdelen: { productId: string; aantal: number; prijsPerEenheid: number; totaal: number }[];
};

const euro = (c: number) => c / 100;

function bereik(min: number, max: number): Bedrag {
  return min === max ? euro(min) : { min: euro(min), max: euro(max) };
}

function veld(r: PricingResult, kies: (s: Samenvatting) => number): Bedrag {
  const b = r.bandbreedte;
  const midden = kies({ kosten: r.kosten, subtotaalExclCenten: r.subtotaalExclCenten, btwCenten: r.btwCenten, totaalInclCenten: r.totaalInclCenten });
  return b ? bereik(kies(b.min), kies(b.max)) : euro(midden);
}

export function breakdownRangeVan(r: PricingResult): BreakdownRange {
  return {
    modus: r.bandbreedte?.modus ?? "GEEN",
    arbeidskosten: veld(r, (s) => s.kosten.arbeid),
    materiaalkosten: veld(r, (s) => s.kosten.materiaal + s.kosten.extra + s.kosten.artikel),
    transportkosten: veld(r, (s) => s.kosten.transport),
    voorrijkosten: veld(r, (s) => s.kosten.voorrijkosten),
    subtotaal: veld(r, (s) => s.subtotaalExclCenten),
    btw: veld(r, (s) => s.btwCenten),
    totaal: veld(r, (s) => s.totaalInclCenten),
    heeftSelectie: r.heeftSelectie,
    margeOmlaag: r.bandbreedte?.margeOmlaag,
    margeOmhoog: r.bandbreedte?.margeOmhoog,
    onderdelen: r.onderdelen.map((o) => ({ productId: o.id, aantal: o.hoeveelheid, prijsPerEenheid: o.hoeveelheid > 0 ? euro(o.subtotaalExclCenten) / o.hoeveelheid : 0, totaal: euro(o.subtotaalExclCenten) })),
  };
}

// Eén representatief getal in centen: de bovengrens bij een bandbreedte (liever een te hoge dan een
// te lage pipeline-inschatting voor de hovenier).
export function totaalTopCenten(r: PricingResult): number {
  return r.bandbreedte ? r.bandbreedte.max.totaalInclCenten : r.totaalInclCenten;
}
