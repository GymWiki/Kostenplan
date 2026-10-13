import type { OfferteInhoud } from "@/app/lib/offerte/model";

// Een factuur hergebruikt het model van de offerte (afzender, klant, projectadres, secties en regels, huisstijl):
// `FactuurInhoud` is een OfferteInhoud met factuurgegevens erbij. Zo gebruiken document, editor, totalen, PDF en
// deelflow dezelfde onderdelen. Bij een factuur betekent `nummer` het factuurnummer ("" zolang het een concept is),
// `datum` de factuurdatum en `geldigTot` de vervaldatum; `voorwaarden`, `herroeping`, `planning` en `bijlagen` blijven leeg.

export type FactuurSoort = "factuur" | "termijn" | "eindfactuur" | "creditnota";

export type FactuurMeta = {
  soort: FactuurSoort;
  // Null zolang het een concept is.
  nummer: string | null;
  factuurdatum: string; // yyyy-mm-dd
  // Datum van uitvoering/levering, of een periode (van t/m tot). Bij een aanbetaling: de datum van de vooruitbetaling.
  uitvoeringVan: string;
  uitvoeringTot: string;
  vervaldatum: string;
  betaaltermijnDagen: number;
  offerteNummer: string;
  offerteVersie: number | null;
  btwModus: "normaal" | "verlegd";
  // Btw-id van de klant: verplicht bij btw verlegd.
  klantBtwId: string;
  betaallink: string;
  // Bij een termijnfactuur: welk deel van de offerte dit is.
  termijn?: { label: string; percentage: number; offerteTotaalInclCenten: number };
  // Bij een creditnota: de oorspronkelijke factuur.
  creditVoor?: { nummer: string; datum: string };
  notitie: string;
};

export type FactuurInhoud = OfferteInhoud & { factuur: FactuurMeta };

export const SOORT_NAAR_TYPE = { factuur: "FACTUUR", termijn: "TERMIJN", eindfactuur: "EINDFACTUUR", creditnota: "CREDITNOTA" } as const;
export const TYPE_NAAR_SOORT = { FACTUUR: "factuur", TERMIJN: "termijn", EINDFACTUUR: "eindfactuur", CREDITNOTA: "creditnota" } as const;
export const reeksVan = (soort: FactuurSoort) => (soort === "creditnota" ? "C" : "F");

export const FACTUUR_STATUS_LABEL = {
  CONCEPT: "Concept",
  DEFINITIEF: "Definitief",
  VERSTUURD: "Verstuurd",
  DEELS_BETAALD: "Deels betaald",
  BETAALD: "Betaald",
  GECREDITEERD: "Gecrediteerd",
} as const;

export const BTW_VERLEGD_TEKST = "Btw verlegd";
export const titelVan = (soort: FactuurSoort) => (soort === "creditnota" ? "Creditnota" : "Factuur");
