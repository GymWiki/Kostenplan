// Btw-tarieven als configuratie, niet hard gecodeerd in de berekening.
// Het verlaagde tarief voor planten kan per 2028 naar 21% gaan: dan hoeft hier
// alleen deze lijst en de standaard per regeltype aangepast te worden.
export const BTW_TARIEVEN = [21, 9, 0] as const;
export type BtwTarief = number;

export type RegelSoort = "arbeid" | "materiaal" | "planten" | "transport" | "overig";

export const REGEL_SOORT_LABEL: Record<RegelSoort, string> = {
  arbeid: "Arbeid en aanleg",
  materiaal: "Materiaal",
  planten: "Levering planten",
  transport: "Transport en voorrijkosten",
  overig: "Overig",
};

// Standaard per regeltype; de hovenier kan dit per bedrijf (Profiel) en per regel aanpassen.
export const STANDAARD_BTW_PER_SOORT: Record<RegelSoort, number> = {
  arbeid: 21,
  materiaal: 21,
  planten: 9,
  transport: 21,
  overig: 21,
};

export function btwVoorSoort(soort: RegelSoort, instelling?: Partial<Record<RegelSoort, number>> | null): number {
  const v = instelling?.[soort];
  return typeof v === "number" && Number.isFinite(v) ? v : STANDAARD_BTW_PER_SOORT[soort];
}

// Herkent regels voor de levering van planten op naam, zodat ze het verlaagde
// tarief als standaard krijgen. Een aanname: de hovenier kan het altijd aanpassen.
export function isPlantenNaam(naam: string): boolean {
  return /\b(haag|hagen|boom|bomen|plant|planten|struik|struiken|conifeer|coniferen|hortensia|vaste planten|beplanting)\b/i.test(naam);
}
