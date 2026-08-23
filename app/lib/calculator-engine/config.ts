import type { CalculatorConfigData, CalculatorTypeId } from "./types";
import type { AnyCalculatorConfigData, ModulaireCalculatorConfigData, OnderdeelConfig } from "./modulair-types";

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

// Levering B v2 (Deel 2): het lege startpunt voor de modulaire
// Onderdelen-ervaring — nul Onderdelen, de vakman begint bij "+ Onderdeel
// toevoegen" (zie de builder-UI, Fase 5).
export function legeModulaireCalculatorConfig(calculatorType: CalculatorTypeId = "CONFIGURATOR"): ModulaireCalculatorConfigData {
  return {
    versie: 2,
    calculatorType,
    onderdelen: [],
    resultaatInstellingen: {
      weergave: "UITGEBREID",
      afronding: "GEEN",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: null,
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    },
  };
}

function parseOnderdeel(ruw: Partial<OnderdeelConfig>, index: number): OnderdeelConfig {
  return {
    id: typeof ruw.id === "string" && ruw.id ? ruw.id : `onderdeel-${index}`,
    naam: typeof ruw.naam === "string" ? ruw.naam : "Onderdeel",
    beschrijving: typeof ruw.beschrijving === "string" ? ruw.beschrijving : undefined,
    icoon: typeof ruw.icoon === "string" ? ruw.icoon : undefined,
    actief: ruw.actief !== false,
    order: typeof ruw.order === "number" ? ruw.order : index,
    velden: Array.isArray(ruw.velden) ? ruw.velden : [],
    afgeleideVariabelen: Array.isArray(ruw.afgeleideVariabelen) ? ruw.afgeleideVariabelen : [],
    regels: Array.isArray(ruw.regels) ? ruw.regels : [],
  };
}

// Parseert een ruwe Json-waarde (uit CalculatorConfig.config) naar
// AnyCalculatorConfigData, met een lege modulaire configuratie als veilige
// terugval — zelfde patroon als parseResultaatConfig() e.d. in
// app/lib/tools.ts. `versie` discrimineert: 1 = de bestaande platte
// calculator (ongewijzigd gedrag), 2 = het nieuwe modulaire Onderdelensysteem,
// alles anders (incl. leeg/onbekend) valt terug op een lege v2-config —
// nieuwe tools starten voortaan in de Onderdelen-ervaring.
export function parseCalculatorConfig(json: unknown): AnyCalculatorConfigData {
  if (!json || typeof json !== "object") return legeModulaireCalculatorConfig();
  const versie = (json as { versie?: unknown }).versie;

  if (versie === 1) {
    const ruw = json as Partial<CalculatorConfigData>;
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

  if (versie === 2) {
    const ruw = json as Partial<ModulaireCalculatorConfigData>;
    return {
      versie: 2,
      calculatorType: ruw.calculatorType ?? "CONFIGURATOR",
      onderdelen: Array.isArray(ruw.onderdelen) ? ruw.onderdelen.map((o, i) => parseOnderdeel(o, i)) : [],
      resultaatInstellingen: ruw.resultaatInstellingen ?? legeModulaireCalculatorConfig().resultaatInstellingen,
    };
  }

  return legeModulaireCalculatorConfig();
}

// Deel 35 (gevoelige prijsinformatie): de versie van de configuratie die
// daadwerkelijk naar de browser mag — sluit `intern`-regels volledig uit
// (niet alleen "verborgen tonen": ze zitten letterlijk niet in de JSON die
// naar de client gaat, dus ook niet zichtbaar via devtools/netwerktab). Zie
// de uitleg bij PriceRule.intern in types.ts voor waarom dit betekent dat
// interne regels niet meetellen in de live, klant-zichtbare prijs.
export function publicCalculatorConfig(config: AnyCalculatorConfigData): AnyCalculatorConfigData {
  if (config.versie === 2) {
    return {
      ...config,
      onderdelen: config.onderdelen.map((onderdeel) => ({
        ...onderdeel,
        regels: onderdeel.regels.filter((regel) => !regel.intern),
      })),
    };
  }
  return {
    ...config,
    regels: config.regels.filter((regel) => !regel.intern),
  };
}
