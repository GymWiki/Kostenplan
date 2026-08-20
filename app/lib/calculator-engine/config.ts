import type { CalculatorConfigData, CalculatorTypeId } from "./types";

// ---------------------------------------------------------------------------
// Standaardconfiguratie voor een gloednieuwe, lege rekentool (Deel 30) — een
// naam, nul velden, nul regels: de vakman begint letterlijk bij "Vraag
// toevoegen" (zie de builder-UI, Fase 9).
// ---------------------------------------------------------------------------

export function legeCalculatorConfig(calculatorType: CalculatorTypeId = "PROJECT"): CalculatorConfigData {
  return {
    versie: 1,
    calculatorType,
    velden: [],
    afgeleideVariabelen: [],
    regels: [],
    stappen: [],
    resultaatInstellingen: {
      weergave: "EXACT",
      afronding: "GEEN",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: null,
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    },
  };
}

// Parseert een ruwe Json-waarde (uit CalculatorConfig.config) naar
// CalculatorConfigData, met een lege configuratie als veilige terugval —
// zelfde patroon als parseResultaatConfig() e.d. in app/lib/tools.ts.
export function parseCalculatorConfig(json: unknown): CalculatorConfigData {
  if (!json || typeof json !== "object") return legeCalculatorConfig();
  const ruw = json as Partial<CalculatorConfigData>;
  if (ruw.versie !== 1) return legeCalculatorConfig();
  return {
    versie: 1,
    calculatorType: ruw.calculatorType ?? "PROJECT",
    velden: Array.isArray(ruw.velden) ? ruw.velden : [],
    afgeleideVariabelen: Array.isArray(ruw.afgeleideVariabelen) ? ruw.afgeleideVariabelen : [],
    regels: Array.isArray(ruw.regels) ? ruw.regels : [],
    stappen: Array.isArray(ruw.stappen) ? ruw.stappen : [],
    resultaatInstellingen: ruw.resultaatInstellingen ?? legeCalculatorConfig().resultaatInstellingen,
  };
}

// Deel 35 (gevoelige prijsinformatie): de versie van de configuratie die
// daadwerkelijk naar de browser mag — sluit `intern`-regels volledig uit
// (niet alleen "verborgen tonen": ze zitten letterlijk niet in de JSON die
// naar de client gaat, dus ook niet zichtbaar via devtools/netwerktab). Zie
// de uitleg bij PriceRule.intern in types.ts voor waarom dit betekent dat
// interne regels niet meetellen in de live, klant-zichtbare prijs.
export function publicCalculatorConfig(config: CalculatorConfigData): CalculatorConfigData {
  return {
    ...config,
    regels: config.regels.filter((regel) => !regel.intern),
  };
}
