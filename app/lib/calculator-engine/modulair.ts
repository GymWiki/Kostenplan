import type { OnderdeelConfig, AnyCalculatorConfigData } from "./modulair-types";
import type { CalculatorField } from "./types";
import { bouwScope, pasAfgeleideVariabelenToe, veldIsIngevuld, type RuweVeldWaarden } from "./fields";
import { evaluatePriceRules, type EvaluatedLineItem, type PriceRuleEvaluationResult } from "./pricing";
import type { ExpressionScope } from "./expression";

// ---------------------------------------------------------------------------
// De combinatielaag voor het modulaire Onderdelensysteem (Deel 11/13 van de
// opdracht: "Tool-Totaal"). Dit bestand voegt GEEN nieuwe prijslogica toe —
// het roept bouwScope/pasAfgeleideVariabelenToe/evaluatePriceRules (dezelfde
// functies als de bestaande platte calculator) één keer per Onderdeel aan,
// met een eigen geïsoleerde scope (zodat twee Onderdelen gerust een veld met
// dezelfde id kunnen hebben zonder botsing), en telt daarna simpelweg de
// resultaten op. Elk Onderdeel is zo écht "zelfstandig" (Deel 1).
//
// combineerOnderdelen() levert een gewone PriceRuleEvaluationResult op — de
// bestaande bouwResultaat() in result.ts kan dat resultaat dus ONGEWIJZIGD
// verwerken (BTW/afronding/bandbreedte blijven Tool-brede instellingen,
// precies zoals vandaag). Geen tweede, concurrerende prijsengine.
// ---------------------------------------------------------------------------

export type OnderdeelLineItem = EvaluatedLineItem & { onderdeelId: string; onderdeelNaam: string };

export type OnderdeelEvaluatie = {
  onderdeelId: string;
  onderdeelNaam: string;
  // De geïsoleerde scope van dit ene Onderdeel — teruggegeven zodat de
  // renderer 'm ook kan hergebruiken voor zichtbaarAls/verplichtAls-checks
  // op de velden van dit Onderdeel, zonder de scope een tweede keer te
  // moeten opbouwen.
  scope: ExpressionScope;
  lineItems: OnderdeelLineItem[];
  subtotaal: number;
  heeftGeldigeInvoer: boolean;
};

export function evalueerOnderdeel(
  onderdeel: OnderdeelConfig,
  waarden: RuweVeldWaarden,
  materiaalPrijzen: Record<string, number> = {},
  opts: { alleenPubliek?: boolean } = {}
): OnderdeelEvaluatie {
  const scope = pasAfgeleideVariabelenToe(bouwScope(onderdeel.velden, waarden, materiaalPrijzen), onderdeel.afgeleideVariabelen);
  const evaluatie = evaluatePriceRules(onderdeel.regels, scope, opts);
  const lineItems: OnderdeelLineItem[] = evaluatie.lineItems.map((item) => ({
    ...item,
    onderdeelId: onderdeel.id,
    onderdeelNaam: onderdeel.naam,
  }));
  const heeftGeldigeInvoer = onderdeel.velden.every((veld) => veldIsIngevuld(veld, waarden[veld.id], scope));
  return { onderdeelId: onderdeel.id, onderdeelNaam: onderdeel.naam, scope, lineItems, subtotaal: evaluatie.subtotaal, heeftGeldigeInvoer };
}

// Voegt de resultaten van alle (actieve) Onderdelen samen tot één geldige
// PriceRuleEvaluationResult — het invoerformaat dat bouwResultaat() in
// result.ts al verwacht, dus die functie hoeft niets te weten van
// "meerdere Onderdelen".
export function combineerOnderdelen(evaluaties: OnderdeelEvaluatie[]): PriceRuleEvaluationResult {
  return {
    lineItems: evaluaties.flatMap((e) => e.lineItems),
    subtotaal: evaluaties.reduce((som, e) => som + e.subtotaal, 0),
  };
}

// Alle velden van een configuratie, ongeacht versie — v1 heeft er één platte
// lijst van, v2 verspreid over Onderdelen. Gebruikt door de publieke
// pagina's/de bouwer om PRODUCT_KEUZE-materiaalopties op te halen zonder dat
// die code zelf hoeft te weten welke versie de configuratie heeft.
export function alleVeldenVanConfig(config: AnyCalculatorConfigData): CalculatorField[] {
  return config.versie === 2 ? config.onderdelen.flatMap((o) => o.velden) : config.velden;
}
