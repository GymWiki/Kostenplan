import type { CalculatorTypeId } from "./types";

// ---------------------------------------------------------------------------
// Calculator-types (Deel 5 van de opdracht) — een registry, zelfde patroon
// als SJABLOON_REGISTRY in sjablonen.ts. Bewust puur beschrijvend: het
// onderliggende engine-gedrag (velden/regels/expressies) is voor elk type
// identiek generiek — een CalculatorType bepaalt alleen wélke veldsoorten de
// builder als eerste voorstelt en welke voorbeeldtekst/flow-copy hoort bij
// "dit is een oppervlakte-achtige berekening" versus "dit is een
// configurator". Nieuwe types komen er hier gewoon bij, zonder dat de rest
// van de engine hoeft te weten dat ze bestaan (Deel 5: "Nieuwe calculator-
// types moeten later toegevoegd kunnen worden zonder bestaande calculators
// te wijzigen").
// ---------------------------------------------------------------------------

export type CalculatorTypeDefinitie = {
  id: CalculatorTypeId;
  label: string;
  beschrijving: string;
  voorbeeldenTekst: string;
  // Welke veldsoorten de builder als eerste aanbiedt voor dit type (de volle
  // lijst blijft altijd beschikbaar — dit is puur een UX-volgorde/nadruk).
  aanbevolenVeldsoorten: string[];
};

const oppervlakte: CalculatorTypeDefinitie = {
  id: "OPPERVLAKTE",
  label: "Oppervlakte",
  beschrijving: "Een prijs op basis van lengte × breedte, bijv. bestrating, gazon of vloeren.",
  voorbeeldenTekst: "bestrating, gazon, vloeren, schilderwerk",
  aanbevolenVeldsoorten: ["AFMETINGEN", "PRODUCT_KEUZE", "JA_NEE"],
};

const ruimte: CalculatorTypeDefinitie = {
  id: "RUIMTE",
  label: "Ruimte",
  beschrijving: "De klant voegt één of meerdere ruimtes toe (bijv. kamers) met elk hun eigen afmetingen.",
  voorbeeldenTekst: "schilderwerk per kamer, stucwerk, vloerverwarming",
  aanbevolenVeldsoorten: ["AFMETINGEN", "AANTAL", "PRODUCT_KEUZE"],
};

const product: CalculatorTypeDefinitie = {
  id: "PRODUCT",
  label: "Product",
  beschrijving: "De klant kiest een product en een aantal — eenvoudige aantal × prijs-berekening.",
  voorbeeldenTekst: "los materiaal, artikelen met een vaste stukprijs",
  aanbevolenVeldsoorten: ["PRODUCT_KEUZE", "AANTAL"],
};

const werkzaamheden: CalculatorTypeDefinitie = {
  id: "WERKZAAMHEDEN",
  label: "Werkzaamheden",
  beschrijving: "Een prijs op basis van gewerkte tijd, met optionele extra werkzaamheden.",
  voorbeeldenTekst: "timmerwerk, klussen, onderhoud",
  aanbevolenVeldsoorten: ["NUMMER", "JA_NEE", "DROPDOWN"],
};

const project: CalculatorTypeDefinitie = {
  id: "PROJECT",
  label: "Project",
  beschrijving: "Een berekening die meerdere onderdelen combineert (materiaal, arbeid, transport, extra's).",
  voorbeeldenTekst: "tuinaanleg, verbouwing, complete projecten",
  aanbevolenVeldsoorten: ["AFMETINGEN", "PRODUCT_KEUZE", "DROPDOWN", "JA_NEE"],
};

const configurator: CalculatorTypeDefinitie = {
  id: "CONFIGURATOR",
  label: "Configurator",
  beschrijving: "De klant stelt een product samen uit meerdere onderdelen, elk met eigen opties en prijzen.",
  voorbeeldenTekst: "kozijnen, keukens, maatwerk",
  aanbevolenVeldsoorten: ["DROPDOWN", "AFMETINGEN", "RADIO", "SLIDER"],
};

export const CALCULATOR_TYPE_REGISTRY = {
  OPPERVLAKTE: oppervlakte,
  RUIMTE: ruimte,
  PRODUCT: product,
  WERKZAAMHEDEN: werkzaamheden,
  PROJECT: project,
  CONFIGURATOR: configurator,
} satisfies Record<CalculatorTypeId, CalculatorTypeDefinitie>;

export const CALCULATOR_TYPE_OPTIES: CalculatorTypeDefinitie[] = Object.values(CALCULATOR_TYPE_REGISTRY);

export function calculatorTypeDefinitie(id: CalculatorTypeId): CalculatorTypeDefinitie {
  return CALCULATOR_TYPE_REGISTRY[id];
}
