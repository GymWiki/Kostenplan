import type { Bedrag as WeergaveBedrag, BreakdownRange as WeergaveBreakdown } from "@/app/lib/pricing/weergave";
import { berekenPrijs, geselecteerdeMateriaalId } from "@/app/lib/pricing/engine";
import { breakdownRangeVan } from "@/app/lib/pricing/weergave";
import { arbeidTariefVoorEenheid, configVanProducten, invoerVanKlant } from "@/app/lib/pricing/adapters";
import { DAGDELEN_PER_DAG, UREN_PER_DAG } from "@/app/lib/pricing/engine";

export type ArbeidStapEenheid = "UUR" | "DAGDEEL" | "DAG";

export type CalcCostSettings = {
  arbeidEnabled: boolean;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTariefUur: number;
  arbeidTariefDagdeel: number;
  arbeidTariefDag: number;
  // Rond de arbeidstijd van een product af op hele arbeidStapEenheid-stappen
  // i.p.v. 'm continu (lineair) door te rekenen. Uit = continu (standaard).
  arbeidAfronden: boolean;
  transportEnabled: boolean;
  transportTarief: number;
  voorrijEnabled: boolean;
  voorrijTarief: number;
  materiaalEnabled: boolean;
  btwPercentage: number;
  bandbreedteModus: BandbreedteModus;
  bandbreedteMargeOmlaag: number;
  bandbreedteMargeOmhoog: number;
};

// Omrekening van arbeidseenheden naar werkdagen (voor transport per dag en de
// preset-productiviteit). TODO(Pieter): bevestig 1 dag = 2 dagdelen = 8 uur.
export { DAGDELEN_PER_DAG, UREN_PER_DAG } from "@/app/lib/pricing/engine";

export function dagenVoorArbeidstijd(arbeidstijd: number, stapEenheid: ArbeidStapEenheid): number {
  if (stapEenheid === "DAGDEEL") return arbeidstijd / DAGDELEN_PER_DAG;
  if (stapEenheid === "UUR") return arbeidstijd / UREN_PER_DAG;
  return arbeidstijd;
}

export type PrijsType = "VAST" | "BANDBREEDTE";
export type BandbreedteModus = "GEEN" | "PER_PRODUCT" | "TOTAAL";

export type CalcMaterialOption = {
  id: string;
  naam: string;
  // Volledige verkoopprijs per eenheid — inclusief de marge van de vakman.
  // Geen aparte opslaglaag meer (zie CostSettings).
  prijs: number;
  prijsType: PrijsType;
  prijsMin: number | null;
  prijsMax: number | null;
  stapgrootte: number | null;
  // Vervangt Product.productiviteit voor dit materiaal (bijv. natuursteen
  // legt trager dan betontegel). Leeg = gebruik de productiviteit van het
  // product. Geldt alleen voor de eerste (primaire) materiaalcategorie van
  // een product — zie primaireGeselecteerdeOptie() hieronder.
  productiviteitOverride: number | null;
};

export type CalcMaterialCategory = {
  id: string;
  naam: string;
  materialen: CalcMaterialOption[];
};

export type CalcExtraOption = {
  id: string;
  prijs: number;
  // Toeslag: telt altijd mee, zonder keuze van de klant.
  altijd?: boolean;
  type: "PER_EENHEID" | "PER_STUK";
};

export type CalcProduct = {
  id: string;
  // Kostenopbouw — vier blokken. Materiaal loopt via materiaalCategorieen
  // hieronder (blok 1), de rest hier (blok 2-4). Zie berekenProductKosten().
  productiviteit: number | null;
  arbeidTariefOverride: number | null;
  transportkostenOverride: number | null;
  transportMeeschalend: boolean;
  transportPerDag?: boolean;
  voorrijkostenOverride: number | null;
  voorrijMeeschalend: boolean;
  materiaalCategorieen: CalcMaterialCategory[];
  extraOpties: CalcExtraOption[];
};


// Welk van de drie bedrijfstarieven geldt voor de huidige arbeidStapEenheid (drie losse velden, zodat
// wisselen van eenheid nooit een bestaand tarief als bedrag voor een andere eenheid herinterpreteert).
export const arbeidTariefVoorStapEenheid = arbeidTariefVoorEenheid;

// Welke materiaaloptie telt mee voor deze categorie? Een categorie met precies één optie heeft
// niets te kiezen; anders de keuze van de klant. Eén definitie, gedeeld met de rekenkern.
export function geselecteerdeMateriaalOptieId(category: CalcMaterialCategory, materialSelections: Record<string, string>): string | null {
  return geselecteerdeMateriaalId(category.materialen, materialSelections[category.id]);
}

export type Bedrag = WeergaveBedrag;
export type BreakdownRange = WeergaveBreakdown;

// Een representatief getal uit een Bedrag — voor plekken die per definitie één getal nodig
// hebben (bijv. Lead.totaalIndicatie). Neemt bewust de bovengrens.
export function bedragTop(bedrag: Bedrag): number {
  return typeof bedrag === "number" ? bedrag : bedrag.max;
}

// Dunne laag boven de rekenkern (app/lib/pricing) voor plekken die met de oude vorm werken:
// losse mappen op id, bedragen in euro's. Alle rekenwerk gebeurt in berekenPrijs().
type BerekenArgs = {
  products: CalcProduct[];
  productQty: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  costSettings: CalcCostSettings;
};

export function calculateBreakdownRange({ products, productQty, materialSelections, extraSelections, costSettings }: BerekenArgs): BreakdownRange {
  // De hoeveelheden zijn hier al uitgerekend (bijv. lengte × breedte), dus elk onderdeel telt als "Eén hoeveelheid".
  const producten = products.map((p) => ({ ...p, sjabloon: "ENKELE_HOEVEELHEID" as const }));
  const resultaat = berekenPrijs(
    configVanProducten(producten, costSettings),
    invoerVanKlant({ producten, hoeveelheden: productQty, materiaalKeuzes: materialSelections, extraKeuzes: extraSelections })
  );
  return breakdownRangeVan(resultaat);
}

export function calculateBreakdown(args: BerekenArgs) {
  const b = calculateBreakdownRange({ ...args, costSettings: { ...args.costSettings, bandbreedteModus: "GEEN" } });
  return {
    arbeidskosten: b.arbeidskosten as number,
    materiaalkosten: b.materiaalkosten as number,
    transportkosten: b.transportkosten as number,
    voorrijkosten: b.voorrijkosten as number,
    subtotaal: b.subtotaal as number,
    btw: b.btw as number,
    totaal: b.totaal as number,
    heeftSelectie: b.heeftSelectie,
    productRegels: b.onderdelen,
  };
}
