import type { CalculatorField, DerivedVariable, PriceRule } from "../types";
import type { TemplateMateriaalKeuze } from "../templates/types";

// ---------------------------------------------------------------------------
// Onderdeel-templates (Levering B v2, Deel 7/14 van de opdracht) — een
// snelstart voor "+ Onderdeel toevoegen -> Bestaand onderdeel gebruiken".
// Zelfde copy-on-use-principe als de bestaande (versie-1) templates in
// ../templates/: `bouwSlice()` levert een verse waarde-kopie, nooit een
// gedeelde referentie; kiezen ontkoppelt volledig van de template (Deel 29).
//
// Bewust GEEN eigen `stappen`/`resultaatInstellingen` (die zijn Tool-brede
// concepten in het modulaire systeem, zie modulair-types.ts) — een
// Onderdeel-template levert alleen de drie dingen die een Onderdeel zelf
// heeft: velden, afgeleide variabelen, prijsregels.
// ---------------------------------------------------------------------------

export type OnderdeelSlice = {
  velden: CalculatorField[];
  afgeleideVariabelen: DerivedVariable[];
  regels: PriceRule[];
};

export type OnderdeelTemplate = {
  id: string;
  naam: string;
  categorie: string;
  beschrijving: string;
  icoon: string;
  bouwSlice: () => OnderdeelSlice;
  // Zelfde placeholder-mechanisme als TemplateMateriaalKeuze in
  // ../templates/types.ts: een PRODUCT_KEUZE-veld in bouwSlice() heeft nog
  // geen echte materialCategoryId (die ontstaat pas bij instantiëren, zie
  // createModulaireToolFromTemplateAction in app/lib/actions/tools.ts).
  materiaalKeuzes: TemplateMateriaalKeuze[];
};
