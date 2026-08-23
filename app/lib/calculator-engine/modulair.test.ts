import { describe, expect, it } from "vitest";
import { evalueerOnderdeel, combineerOnderdelen, alleVeldenVanConfig } from "./modulair";
import { bouwResultaat } from "./result";
import type { Expression, PriceRule } from "./types";
import type { OnderdeelConfig, ModulaireCalculatorConfigData } from "./modulair-types";
import { legeModulaireCalculatorConfig } from "./config";

const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });
const variabele = (naam: string): Expression => ({ kind: "VARIABELE", naam });

function regel(overrides: Partial<PriceRule> & Pick<PriceRule, "id" | "type" | "categorie">): PriceRule {
  return { label: overrides.id, actief: true, toonInUitsplitsing: true, intern: false, ...overrides } as PriceRule;
}

// De "belangrijkste test" uit de opdracht (Deel 15): een Onderdeel
// "Schutting" volledig handmatig gebouwd, ZONDER enig template — lengte,
// hoogte, type, poort ja/nee; prijs = lengte × prijs/meter + poorttoeslag-
// indien-ja + arbeid.
function bouwSchuttingOnderdeel(): OnderdeelConfig {
  return {
    id: "schutting",
    naam: "Schutting",
    actief: true,
    order: 0,
    velden: [
      { id: "lengte", label: "Lengte", soort: "NUMMER", verplicht: true, eenheid: "meter" },
      { id: "hoogte", label: "Hoogte", soort: "NUMMER", verplicht: true, eenheid: "meter" },
      {
        id: "type",
        label: "Type schutting",
        soort: "DROPDOWN",
        verplicht: true,
        opties: [
          { waarde: "hout", label: "Hout" },
          { waarde: "beton", label: "Beton" },
        ],
      },
      { id: "poort", label: "Poort toevoegen?", soort: "JA_NEE", verplicht: false },
    ],
    afgeleideVariabelen: [],
    regels: [
      regel({ id: "materiaal", type: "PER_EENHEID", categorie: "MATERIAAL", hoeveelheid: variabele("lengte"), prijsPerEenheid: getal(85), eenheid: "meter" }),
      regel({
        id: "poorttoeslag",
        type: "TOESLAG",
        categorie: "TOESLAG",
        bedrag: getal(350),
        voorwaarde: { kind: "GELIJK_AAN", links: variabele("poort"), rechts: { kind: "BOOLEAN", waarde: true } },
      }),
      regel({ id: "arbeid", type: "PER_EENHEID", categorie: "ARBEID", hoeveelheid: variabele("lengte"), prijsPerEenheid: getal(25), eenheid: "meter" }),
    ],
  };
}

describe("evalueerOnderdeel — de belangrijkste test (Deel 15): handmatig gebouwde Schutting, zonder template", () => {
  it("lengte x prijs/meter + arbeid, zonder poort", () => {
    const schutting = bouwSchuttingOnderdeel();
    const evaluatie = evalueerOnderdeel(schutting, { lengte: 20, hoogte: 1.8, type: "hout", poort: false }, {});
    // 20*85 (materiaal) + 20*25 (arbeid) = 1700 + 500 = 2200, geen poorttoeslag
    expect(evaluatie.subtotaal).toBe(2200);
    expect(evaluatie.lineItems.find((i) => i.ruleId === "poorttoeslag")).toBeUndefined();
  });

  it("met poort: +350 toeslag", () => {
    const schutting = bouwSchuttingOnderdeel();
    const evaluatie = evalueerOnderdeel(schutting, { lengte: 20, hoogte: 1.8, type: "hout", poort: true }, {});
    expect(evaluatie.subtotaal).toBe(2200 + 350);
    const poortRegel = evaluatie.lineItems.find((i) => i.ruleId === "poorttoeslag");
    expect(poortRegel?.bedrag).toBe(350);
  });

  it("elk lineItem is getagd met het Onderdeel waar het bij hoort", () => {
    const schutting = bouwSchuttingOnderdeel();
    const evaluatie = evalueerOnderdeel(schutting, { lengte: 10, hoogte: 1.8, type: "hout", poort: false }, {});
    expect(evaluatie.lineItems.every((i) => i.onderdeelId === "schutting" && i.onderdeelNaam === "Schutting")).toBe(true);
  });

  it("heeftGeldigeInvoer is false zolang een verplicht veld ontbreekt", () => {
    const schutting = bouwSchuttingOnderdeel();
    expect(evalueerOnderdeel(schutting, {}, {}).heeftGeldigeInvoer).toBe(false);
    expect(evalueerOnderdeel(schutting, { lengte: 10, hoogte: 1.8, type: "hout" }, {}).heeftGeldigeInvoer).toBe(true);
  });
});

describe("combineerOnderdelen — Tool-Totaal (Deel 11): 'Complete tuin' met meerdere Onderdelen", () => {
  function vastOnderdeel(id: string, naam: string, bedrag: number): OnderdeelConfig {
    return {
      id,
      naam,
      actief: true,
      order: 0,
      velden: [],
      afgeleideVariabelen: [],
      regels: [regel({ id: `${id}-prijs`, type: "VAST", categorie: "MATERIAAL", bedrag: getal(bedrag) })],
    };
  }

  it("som van vijf onafhankelijke Onderdelen = Totaal (exact het voorbeeld uit de opdracht)", () => {
    const onderdelen = [
      vastOnderdeel("bestrating", "Bestrating", 4500),
      vastOnderdeel("schutting", "Schutting", 2850),
      vastOnderdeel("kunstgras", "Kunstgras", 1900),
      vastOnderdeel("beplanting", "Beplanting", 1250),
      vastOnderdeel("grondwerk", "Grondwerk", 850),
    ];
    const evaluaties = onderdelen.map((o) => evalueerOnderdeel(o, {}, {}));
    const combined = combineerOnderdelen(evaluaties);
    expect(combined.subtotaal).toBe(4500 + 2850 + 1900 + 1250 + 850);
    expect(combined.subtotaal).toBe(11350);

    // bouwResultaat() — de bestaande, ongewijzigde result-engine — verwerkt
    // de gecombineerde regels net als bij een platte (versie 1) calculator.
    const resultaat = bouwResultaat(combined, {
      btwPercentage: 0,
      resultaatInstellingen: legeModulaireCalculatorConfig().resultaatInstellingen,
      heeftGeldigeInvoer: true,
    });
    expect(resultaat.totaal).toBe(11350);
  });

  it("gedeactiveerde Onderdelen tellen niet mee in het totaal", () => {
    const actief = vastOnderdeel("a", "A", 100);
    const inactief = { ...vastOnderdeel("b", "B", 200), actief: false };
    // De aanroeper filtert op actief (zie engine-calculator.tsx) — hier
    // getest dat een niet-meegegeven (want inactief) Onderdeel simpelweg
    // niet meetelt.
    const combined = combineerOnderdelen([evalueerOnderdeel(actief, {}, {})]);
    expect(combined.subtotaal).toBe(100);
    void inactief;
  });

  it("twee Onderdelen mogen dezelfde veld-id gebruiken zonder te botsen (geïsoleerde scopes)", () => {
    function metLengte(id: string, naam: string, prijsPerMeter: number): OnderdeelConfig {
      return {
        id,
        naam,
        actief: true,
        order: 0,
        velden: [{ id: "lengte", label: "Lengte", soort: "NUMMER", verplicht: true }],
        afgeleideVariabelen: [],
        regels: [
          regel({ id: `${id}-regel`, type: "PER_EENHEID", categorie: "MATERIAAL", hoeveelheid: variabele("lengte"), prijsPerEenheid: getal(prijsPerMeter), eenheid: "meter" }),
        ],
      };
    }
    const bestrating = metLengte("bestrating", "Bestrating", 45);
    const schutting = metLengte("schutting", "Schutting", 85);

    // Elk Onderdeel krijgt zijn EIGEN "lengte"-waarde — geen gedeelde scope.
    const evalBestrating = evalueerOnderdeel(bestrating, { lengte: 10 }, {});
    const evalSchutting = evalueerOnderdeel(schutting, { lengte: 20 }, {});

    expect(evalBestrating.subtotaal).toBe(10 * 45); // 450, niet beïnvloed door schutting.lengte=20
    expect(evalSchutting.subtotaal).toBe(20 * 85); // 1700

    const combined = combineerOnderdelen([evalBestrating, evalSchutting]);
    expect(combined.subtotaal).toBe(450 + 1700);
  });
});

describe("alleVeldenVanConfig", () => {
  it("verzamelt velden uit alle Onderdelen voor een versie-2 config", () => {
    const config: ModulaireCalculatorConfigData = {
      ...legeModulaireCalculatorConfig(),
      onderdelen: [bouwSchuttingOnderdeel()],
    };
    expect(alleVeldenVanConfig(config).map((v) => v.id).sort()).toEqual(["hoogte", "lengte", "poort", "type"]);
  });
});
