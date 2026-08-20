import { describe, expect, it } from "vitest";
import { afmetingenSubvariabelen, bouwScope, pasAfgeleideVariabelenToe, productKeuzePrijsVariabele } from "./fields";
import type { AfmetingenVeld, CalculatorField, DerivedVariable, NummerVeld } from "./types";

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
