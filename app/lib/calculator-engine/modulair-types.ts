import type { CalculatorField, CalculatorResultSettings, CalculatorTypeId, DerivedVariable, PriceRule } from "./types";
import type { CalculatorConfigData } from "./types";

// ---------------------------------------------------------------------------
// Levering B v2 — het modulaire Onderdelensysteem (Deel 2 van de opdracht):
// een Tool bestaat niet langer uit precies één platte calculator, maar uit
// meerdere zelfstandige Onderdelen die samen tot één totaalresultaat worden
// gecombineerd (zie modulair.ts voor de combinatielogica).
//
// Bewust GEEN nieuwe relationele tabel voor Onderdelen — elk Onderdeel is
// structureel identiek aan wat de bestaande engine al verwerkt
// ({velden, afgeleideVariabelen, regels}), en leeft als element van
// `onderdelen[]` binnen dezelfde CalculatorConfig.config Json die de
// bestaande draft/publish/archiveer-machinery al ondoorzichtig behandelt
// (zie app/lib/actions/calculator-config.ts — die code hoeft dus niets te
// weten van "versie 2" om 'm correct te versioneren/bevriezen voor Leads).
//
// Een Onderdeel is bewust "zelfstandig" (Deel 1): elk Onderdeel wordt met
// een eigen, geïsoleerde expressie-scope geëvalueerd (zie evalueerOnderdeel
// in modulair.ts) — twee Onderdelen mogen dus gerust allebei een veld met
// id "lengte" hebben, zonder ooit te botsen.
// ---------------------------------------------------------------------------

export type OnderdeelConfig = {
  id: string;
  naam: string;
  beschrijving?: string;
  icoon?: string;
  // Activeren/deactiveren (Deel 6) — een niet-actief Onderdeel telt niet mee
  // in de klant-doorloopvolgorde en niet in het totaal, maar blijft
  // bewaard (net als een uitgeschakelde PriceRule.actief).
  actief: boolean;
  // Volgorde bepaalt de klant-doorloopvolgorde (Deel 6) — elk actief
  // Onderdeel wordt precies één stap in de publieke wizard (zie
  // modulair.ts / engine-calculator.tsx), bewust zonder eigen sub-stappen
  // binnen één Onderdeel (simpelste ontwerp dat de opdracht dekt).
  order: number;
  velden: CalculatorField[];
  afgeleideVariabelen: DerivedVariable[];
  regels: PriceRule[];
};

export type ModulaireCalculatorConfigData = {
  versie: 2;
  calculatorType: CalculatorTypeId;
  onderdelen: OnderdeelConfig[];
  resultaatInstellingen: CalculatorResultSettings;
};

// De vorm die CalculatorConfig.config nu daadwerkelijk kan hebben — versie 1
// (bestaand, één platte calculator) blijft byte-voor-byte ongewijzigd
// bruikbaar; versie 2 is puur additief.
export type AnyCalculatorConfigData = CalculatorConfigData | ModulaireCalculatorConfigData;

export function isModulaireConfig(config: AnyCalculatorConfigData): config is ModulaireCalculatorConfigData {
  return config.versie === 2;
}
