import { describe, expect, it } from "vitest";
import { bouwResultaat } from "./result";
import { evaluatePriceRules } from "./pricing";
import type { CalculatorResultSettings, Expression, PriceRule } from "./types";

const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });

function regel(overrides: Partial<PriceRule> & Pick<PriceRule, "id" | "type" | "categorie">) {
  return {
    label: overrides.id,
    actief: true,
    toonInUitsplitsing: true,
    intern: false,
    ...overrides,
  } as PriceRule;
}

const standaardInstellingen: CalculatorResultSettings = {
  weergave: "EXACT",
  afronding: "GEEN",
  ctaType: "OFFERTE_AANVRAGEN",
  ctaTekst: null,
  toelichting: null,
  bandbreedteMargeOmlaag: 10,
  bandbreedteMargeOmhoog: 10,
};

describe("bouwResultaat", () => {
  it("groepeert regels per categorie en telt btw op", () => {
    const evaluatie = evaluatePriceRules(
      [
        regel({ id: "m", type: "VAST", categorie: "MATERIAAL", bedrag: getal(1000) }),
        regel({ id: "a", type: "VAST", categorie: "ARBEID", bedrag: getal(500) }),
      ],
      {}
    );
    const resultaat = bouwResultaat(evaluatie, {
      btwPercentage: 21,
      resultaatInstellingen: standaardInstellingen,
      heeftGeldigeInvoer: true,
    });

    expect(resultaat.materiaal).toBe(1000);
    expect(resultaat.arbeid).toBe(500);
    expect(resultaat.subtotaal).toBe(1500);
    expect(resultaat.btw).toBe(315);
    expect(resultaat.totaal).toBe(1815);
  });

  it("rondt het eindtotaal af volgens resultaatInstellingen.afronding (Deel 14)", () => {
    const evaluatie = evaluatePriceRules([regel({ id: "m", type: "VAST", categorie: "MATERIAAL", bedrag: getal(1030.7) })], {});
    const resultaat = bouwResultaat(evaluatie, {
      btwPercentage: 0,
      resultaatInstellingen: { ...standaardInstellingen, afronding: "HEEL_EURO" },
      heeftGeldigeInvoer: true,
    });
    expect(resultaat.totaal).toBe(1031);
  });

  it("levert een min/max-range bij weergave RANGE", () => {
    const evaluatie = evaluatePriceRules([regel({ id: "m", type: "VAST", categorie: "MATERIAAL", bedrag: getal(1000) })], {});
    const resultaat = bouwResultaat(evaluatie, {
      btwPercentage: 0,
      resultaatInstellingen: { ...standaardInstellingen, weergave: "RANGE", bandbreedteMargeOmlaag: 10, bandbreedteMargeOmhoog: 15 },
      heeftGeldigeInvoer: true,
    });
    expect(resultaat.totaalMin).toBe(900);
    expect(resultaat.totaalMax).toBe(1150);
  });

  it("geeft geen range terug zonder geldige invoer", () => {
    const evaluatie = evaluatePriceRules([], {});
    const resultaat = bouwResultaat(evaluatie, {
      btwPercentage: 0,
      resultaatInstellingen: { ...standaardInstellingen, weergave: "RANGE" },
      heeftGeldigeInvoer: false,
    });
    expect(resultaat.totaalMin).toBeUndefined();
    expect(resultaat.totaalMax).toBeUndefined();
  });

  it("kortingen worden als positief bedrag getoond (voor weergave), maar trekken wel af van het totaal", () => {
    const evaluatie = evaluatePriceRules(
      [
        regel({ id: "m", type: "VAST", categorie: "MATERIAAL", bedrag: getal(1000) }),
        regel({ id: "k", type: "KORTING", categorie: "KORTING", bedrag: getal(100) }),
      ],
      {}
    );
    const resultaat = bouwResultaat(evaluatie, {
      btwPercentage: 0,
      resultaatInstellingen: standaardInstellingen,
      heeftGeldigeInvoer: true,
    });
    expect(resultaat.kortingen).toBe(100);
    expect(resultaat.subtotaal).toBe(900);
  });
});
