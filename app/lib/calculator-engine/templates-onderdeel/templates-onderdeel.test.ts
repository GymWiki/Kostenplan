import { describe, expect, it } from "vitest";
import { ONDERDEEL_TEMPLATES } from "./index";
import { valideerCalculatorConfig } from "../validate";
import { evalueerOnderdeel } from "../modulair";
import type { ModulaireCalculatorConfigData, OnderdeelConfig } from "../modulair-types";
import { legeModulaireCalculatorConfig } from "../config";

// Elk Onderdeel-template moet, verpakt als één actief Onderdeel in een
// verder lege modulaire Tool, door de bouwer-validatie komen zonder
// FOUT-meldingen — precies de garantie die de builder-UI ook afdwingt vóór
// publiceren (zie onderdelen-bouwer.tsx). Vangt typefouten/ontbrekende
// variabelen in de handgeschreven template-data mechanisch af, i.p.v. erop
// te vertrouwen dat de JSON met het blote oog klopt.
describe("ONDERDEEL_TEMPLATES — elk template is een geldig, publiceerbaar Onderdeel", () => {
  it("elk template heeft een uniek id", () => {
    const ids = ONDERDEEL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const template of ONDERDEEL_TEMPLATES) {
    it(`"${template.naam}" (${template.id}) bevat geen FOUT-meldingen`, () => {
      const slice = template.bouwSlice();
      const onderdeel: OnderdeelConfig = {
        id: "test-onderdeel",
        naam: template.naam,
        actief: true,
        order: 0,
        ...slice,
      };
      const config: ModulaireCalculatorConfigData = { ...legeModulaireCalculatorConfig(), onderdelen: [onderdeel] };
      const meldingen = valideerCalculatorConfig(config);
      const fouten = meldingen.filter((m) => m.ernst === "FOUT");
      expect(fouten, JSON.stringify(fouten)).toEqual([]);
    });

    it(`"${template.naam}" (${template.id}) heeft minstens één veld en één actieve prijsregel`, () => {
      const slice = template.bouwSlice();
      expect(slice.velden.length).toBeGreaterThan(0);
      expect(slice.regels.some((r) => r.actief)).toBe(true);
    });

    it(`"${template.naam}" (${template.id}) evalueert zonder te crashen met lege invoer`, () => {
      const slice = template.bouwSlice();
      const onderdeel: OnderdeelConfig = { id: "test-onderdeel", naam: template.naam, actief: true, order: 0, ...slice };
      expect(() => evalueerOnderdeel(onderdeel, {}, {})).not.toThrow();
    });
  }
});
