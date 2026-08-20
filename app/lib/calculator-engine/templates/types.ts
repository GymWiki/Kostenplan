import type { CalculatorConfigData, CalculatorTypeId } from "../types";

// ---------------------------------------------------------------------------
// Templates (Deel 24-27 van de opdracht) — een template is een
// STARTCONFIGURATIE voor een Tool, geen live afhankelijkheid: kiezen
// betekent kopiëren naar een eigen, zelfstandige CalculatorConfig
// (Deel 29 — er mag daarna nergens meer "gebruikt template X" staan, laat
// staan dat de tool ervan afhankelijk blijft).
// ---------------------------------------------------------------------------

// Een PRODUCT_KEUZE-veld in bouwConfig() kan nog geen echte
// materialCategoryId hebben (die bestaat pas ná het aanmaken van de Product/
// MaterialCategory/MaterialOption-rijen voor de nieuwe Tool) — bouwConfig()
// zet er daarom een placeholder-string in (het veld-id zelf) en
// `materiaalKeuzes` beschrijft welke opties er voor dat veld aangemaakt
// moeten worden. instantieerTemplate() in app/lib/actions/tools.ts vervangt
// de placeholder daarna door de echte id.
export type TemplateMateriaalKeuze = {
  veldId: string;
  opties: { naam: string; prijs: number }[];
};

export type CalculatorTemplate = {
  id: string;
  naam: string;
  categorie: string;
  beschrijving: string;
  watHetBerekent: string;
  resterendWerk: string;
  icoon: string;
  calculatorType: CalculatorTypeId;
  bouwConfig: () => CalculatorConfigData;
  materiaalKeuzes: TemplateMateriaalKeuze[];
};
