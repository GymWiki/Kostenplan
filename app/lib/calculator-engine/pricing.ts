import type { PriceRule, PriceRuleCategory, StaffelSchijf } from "./types";
import { RUNNING_SUBTOTAL_VARIABLE } from "./types";
import { asNumber, evaluateAsBoolean, evaluateAsNumber, type ExpressionScope } from "./expression";

// ---------------------------------------------------------------------------
// De prijsregel-engine (Deel 6-8 van de opdracht). Rekent een lijst
// PriceRule's, in volgorde, door tot een lijst regel-uitkomsten plus een
// totaal — elke regel mag via de $subtotaal-variabele (RUNNING_SUBTOTAL_
// VARIABLE) verwijzen naar de som van alle regels die er al vóór stonden
// (zie types.ts), wat Deel 8's "materiaal + arbeid + transport + toeslagen -
// kortingen = subtotaal" precies zo laat werken als een vakman het opschrijft.
// ---------------------------------------------------------------------------

export type EvaluatedLineItem = {
  ruleId: string;
  label: string;
  categorie: PriceRuleCategory;
  // Getekend: een KORTING-regel levert hier een negatief bedrag.
  bedrag: number;
  toonInUitsplitsing: boolean;
  intern: boolean;
};

export type PriceRuleEvaluationResult = {
  lineItems: EvaluatedLineItem[];
  subtotaal: number;
};

// Staffel (Deel 6) — progressief doorgerekend: de eerste schijf geldt voor
// het deel van de hoeveelheid tót zijn grens, de volgende schijf voor het
// deel dáárboven, enzovoort (zoals belastingschijven), niet "de hele
// hoeveelheid tegen het tarief van de hoogst bereikte schijf". Dat is de
// meest voorspelbare, meest gebruikelijke uitleg van een staffelprijs voor
// een vakman en voorkomt een sprong in de prijs bij een schijfgrens.
export function berekenStaffelBedrag(hoeveelheid: number, schijven: StaffelSchijf[]): number {
  let vorigeGrens = 0;
  let totaal = 0;
  for (const schijf of schijven) {
    if (hoeveelheid <= vorigeGrens) break;
    const grens = schijf.tot ?? Infinity;
    const inDezeSchijf = Math.min(hoeveelheid, grens) - vorigeGrens;
    if (inDezeSchijf > 0) totaal += inDezeSchijf * schijf.prijsPerEenheid;
    vorigeGrens = grens;
  }
  return totaal;
}

function berekenRegelBedrag(regel: PriceRule, scope: ExpressionScope): number {
  switch (regel.type) {
    case "VAST":
      return evaluateAsNumber(regel.bedrag, scope);
    case "PER_EENHEID":
      return evaluateAsNumber(regel.hoeveelheid, scope) * evaluateAsNumber(regel.prijsPerEenheid, scope);
    case "PERCENTAGE":
      return (evaluateAsNumber(regel.basis, scope) * evaluateAsNumber(regel.percentage, scope)) / 100;
    case "TOESLAG":
      return evaluateAsNumber(regel.bedrag, scope);
    case "KORTING": {
      if (regel.bedrag) return -Math.abs(evaluateAsNumber(regel.bedrag, scope));
      if (regel.percentage) {
        const lopendeBasis = asNumber(scope[RUNNING_SUBTOTAL_VARIABLE]);
        return -Math.abs((lopendeBasis * evaluateAsNumber(regel.percentage, scope)) / 100);
      }
      return 0;
    }
    case "STAFFEL":
      return berekenStaffelBedrag(evaluateAsNumber(regel.hoeveelheid, scope), regel.schijven);
    case "FORMULE":
      return evaluateAsNumber(regel.formule, scope);
  }
}

// `alleenPubliek`: sluit `intern`-regels uit (Deel 35) — gebruikt wanneer
// deze functie op de PUBLIEKE configuratie draait (die interne regels
// sowieso al nooit bevat, zie config.ts's publicConfig()), maar ook bruikbaar
// voor een dashboard-preview die expliciet "wat ziet de klant" wil simuleren
// zonder de configuratie zelf te hoeven filteren.
export function evaluatePriceRules(
  regels: PriceRule[],
  basisScope: ExpressionScope,
  { alleenPubliek = false }: { alleenPubliek?: boolean } = {}
): PriceRuleEvaluationResult {
  const scope: ExpressionScope = { ...basisScope, [RUNNING_SUBTOTAL_VARIABLE]: 0 };
  const lineItems: EvaluatedLineItem[] = [];
  let lopendeSubtotaal = 0;

  for (const regel of regels) {
    if (!regel.actief) continue;
    if (alleenPubliek && regel.intern) continue;
    if (regel.voorwaarde && !evaluateAsBoolean(regel.voorwaarde, scope)) continue;

    const bedrag = berekenRegelBedrag(regel, scope);
    lineItems.push({
      ruleId: regel.id,
      label: regel.label,
      categorie: regel.categorie,
      bedrag,
      toonInUitsplitsing: regel.toonInUitsplitsing,
      intern: regel.intern,
    });
    lopendeSubtotaal += bedrag;
    scope[RUNNING_SUBTOTAL_VARIABLE] = lopendeSubtotaal;
  }

  return { lineItems, subtotaal: lopendeSubtotaal };
}
