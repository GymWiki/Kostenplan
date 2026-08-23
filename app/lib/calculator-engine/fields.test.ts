import { describe, expect, it } from "vitest";
import { afmetingenSubvariabelen, bouwScope, pasAfgeleideVariabelenToe, productKeuzePrijsVariabele, veldIsIngevuld, veldIsZichtbaar } from "./fields";
import type { AfmetingenVeld, CalculatorField, DerivedVariable, MeerkeuzeVeld, NummerVeld } from "./types";

describe("bouwScope", () => {
  it("zet een NUMMER-veld om naar een numerieke variabele", () => {
    const velden: CalculatorField[] = [
      { id: "lengte", label: "Lengte", soort: "NUMMER", verplicht: true } as NummerVeld,
    ];
    const scope = bouwScope(velden, { lengte: "24" });
    expect(scope.lengte).toBe(24);
  });

  it("een AFMETINGEN-veld levert lengte/breedte/oppervlakte automatisch af (Deel 12)", () => {
    const veld: AfmetingenVeld = {
      id: "afm",
      label: "Afmetingen",
      soort: "AFMETINGEN",
      verplicht: true,
      eenheid: "meter",
      metHoogte: false,
    };
    const scope = bouwScope([veld], { afm: { lengte: 12, breedte: 4 } });
    const namen = afmetingenSubvariabelen("afm", false);
    expect(scope[namen.lengte]).toBe(12);
    expect(scope[namen.breedte]).toBe(4);
    expect(scope[namen.oppervlakte]).toBe(48);
    expect(namen.volume).toBeNull();
  });

  it("een AFMETINGEN-veld met hoogte levert ook volume af", () => {
    const veld: AfmetingenVeld = {
      id: "afm",
      label: "Afmetingen",
      soort: "AFMETINGEN",
      verplicht: true,
      eenheid: "meter",
      metHoogte: true,
    };
    const scope = bouwScope([veld], { afm: { lengte: 2, breedte: 3, hoogte: 4 } });
    const namen = afmetingenSubvariabelen("afm", true);
    expect(scope[namen.oppervlakte]).toBe(6);
    expect(scope[namen.volume!]).toBe(24);
  });

  it("een PRODUCT_KEUZE-veld levert de gekozen optie-id én de bijbehorende prijs", () => {
    const velden: CalculatorField[] = [
      { id: "materiaal", label: "Materiaal", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: "cat-1" },
    ];
    const scope = bouwScope(velden, { materiaal: "optie-douglas" }, { "optie-douglas": 45 });
    expect(scope.materiaal).toBe("optie-douglas");
    expect(scope[productKeuzePrijsVariabele("materiaal")]).toBe(45);
  });

  it("JA_NEE-veld wordt een boolean", () => {
    const velden: CalculatorField[] = [{ id: "sloop", label: "Slopen?", soort: "JA_NEE", verplicht: false }];
    expect(bouwScope(velden, { sloop: true }).sloop).toBe(true);
    expect(bouwScope(velden, { sloop: false }).sloop).toBe(false);
    expect(bouwScope(velden, {}).sloop).toBe(false);
  });

  it("MEERKEUZE-veld (Levering B v2, Deel 3) levert een string[]-variabele, gefilterd op geldige opties", () => {
    const veld: MeerkeuzeVeld = {
      id: "apparaten",
      label: "Apparatuur",
      soort: "MEERKEUZE",
      verplicht: false,
      opties: [
        { waarde: "oven", label: "Oven" },
        { waarde: "kookplaat", label: "Kookplaat" },
      ],
    };
    expect(bouwScope([veld], { apparaten: ["oven", "kookplaat"] }).apparaten).toEqual(["oven", "kookplaat"]);
    // Onbekende/vervalste waarden (niet in veld.opties) worden eruit gefilterd.
    expect(bouwScope([veld], { apparaten: ["oven", "onbekend"] }).apparaten).toEqual(["oven"]);
    // Zonder invoer valt terug op standaardWaarden (leeg als die ontbreken).
    expect(bouwScope([veld], {}).apparaten).toEqual([]);
  });
});

describe("veldIsIngevuld — statisch verplicht vs. verplichtAls (Deel 8 modulair)", () => {
  it("een niet-verplicht veld zonder verplichtAls is altijd 'ingevuld'", () => {
    const veld: NummerVeld = { id: "n", label: "N", soort: "NUMMER", verplicht: false };
    expect(veldIsIngevuld(veld, undefined, {})).toBe(true);
  });

  it("verplichtAls maakt een normaal niet-verplicht veld alsnog verplicht wanneer de voorwaarde waar is", () => {
    const veld: NummerVeld = {
      id: "n",
      label: "N",
      soort: "NUMMER",
      verplicht: false,
      verplichtAls: { kind: "GELIJK_AAN", links: { kind: "VARIABELE", naam: "poort" }, rechts: { kind: "BOOLEAN", waarde: true } },
    };
    expect(veldIsIngevuld(veld, undefined, { poort: true })).toBe(false);
    expect(veldIsIngevuld(veld, 5, { poort: true })).toBe(true);
    expect(veldIsIngevuld(veld, undefined, { poort: false })).toBe(true);
  });

  it("MEERKEUZE-veld is pas 'ingevuld' als er minstens één optie gekozen is", () => {
    const veld: MeerkeuzeVeld = { id: "m", label: "M", soort: "MEERKEUZE", verplicht: true, opties: [{ waarde: "a", label: "A" }] };
    expect(veldIsIngevuld(veld, [], {})).toBe(false);
    expect(veldIsIngevuld(veld, ["a"], {})).toBe(true);
  });
});

describe("veldIsZichtbaar — zichtbaarAls (Deel 5/6)", () => {
  it("een veld zonder zichtbaarAls is altijd zichtbaar", () => {
    const veld: NummerVeld = { id: "n", label: "N", soort: "NUMMER", verplicht: false };
    expect(veldIsZichtbaar(veld, {})).toBe(true);
  });

  it("zichtbaarAls verbergt het veld als de voorwaarde onwaar is", () => {
    const veld: NummerVeld = {
      id: "n",
      label: "N",
      soort: "NUMMER",
      verplicht: false,
      zichtbaarAls: { kind: "GELIJK_AAN", links: { kind: "VARIABELE", naam: "type" }, rechts: { kind: "TEKST", waarde: "hout" } },
    };
    expect(veldIsZichtbaar(veld, { type: "hout" })).toBe(true);
    expect(veldIsZichtbaar(veld, { type: "beton" })).toBe(false);
  });
});

describe("pasAfgeleideVariabelenToe", () => {
  it("berekent een afgeleide variabele op basis van veldvariabelen", () => {
    const afgeleiden: DerivedVariable[] = [
      {
        id: "totaleLengte",
        label: "Totale lengte",
        type: "NUMBER",
        expression: {
          kind: "OPTELLEN",
          termen: [{ kind: "VARIABELE", naam: "a" }, { kind: "VARIABELE", naam: "b" }],
        },
      },
    ];
    const scope = pasAfgeleideVariabelenToe({ a: 3, b: 4 }, afgeleiden);
    expect(scope.totaleLengte).toBe(7);
  });
});
