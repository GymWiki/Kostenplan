// Vakoverstijgende eenhedenlijst voor Product.eenheid. De opgeslagen waarde
// (`value`) is en blijft een vrije string (zie prisma/schema.prisma) — dit
// bestand voegt alleen een nette weergavelabel en logische groepering toe
// voor de UI. Bestaande producten met "m1"/"m2"/"m3"/"stuks" blijven exact
// dezelfde waarde behouden; alleen hun label wordt mooier weergegeven.
export type UnitOption = { value: string; label: string };
export type UnitGroup = { label: string; opties: UnitOption[] };

export const UNIT_GROUPS: UnitGroup[] = [
  {
    label: "Oppervlakte & lengte",
    opties: [
      { value: "m1", label: "m¹" },
      { value: "m2", label: "m²" },
      { value: "m3", label: "m³" },
      { value: "km", label: "km" },
    ],
  },
  {
    label: "Tijd",
    opties: [
      { value: "uur", label: "uur" },
      { value: "dagdeel", label: "dagdeel" },
      { value: "dag", label: "dag" },
    ],
  },
  {
    label: "Aantal & gewicht",
    opties: [
      { value: "stuks", label: "stuks" },
      { value: "set", label: "set" },
      { value: "kg", label: "kg" },
      { value: "ton", label: "ton" },
      { value: "liter", label: "liter" },
      { value: "zak", label: "zak" },
      { value: "pallet", label: "pallet" },
      { value: "rol", label: "rol" },
    ],
  },
  {
    label: "Overig",
    opties: [
      { value: "stelpost", label: "post / stelpost" },
      { value: "procent", label: "%" },
      { value: "vast", label: "forfait / vast bedrag" },
    ],
  },
];

const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  UNIT_GROUPS.flatMap((group) => group.opties.map((optie) => [optie.value, optie.label]))
);

export const CUSTOM_UNIT_VALUE = "__eigen__";

export function isKnownUnit(value: string) {
  return value in UNIT_LABELS;
}

// Nette weergavenaam voor een opgeslagen eenheid — bekende codes krijgen hun
// label (bijv. "m1" -> "m¹ (strekkende meter)"), een eigen/onbekende
// eenheid wordt gewoon getoond zoals opgeslagen.
export function unitLabel(value: string) {
  return UNIT_LABELS[value] ?? value;
}
