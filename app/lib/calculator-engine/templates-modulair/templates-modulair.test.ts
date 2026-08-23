import { describe, expect, it } from "vitest";
import { MODULAIRE_CALCULATOR_TEMPLATES } from "./index";
import { onderdeelTemplateById } from "../templates-onderdeel";
import { valideerCalculatorConfig } from "../validate";
import { legeModulaireCalculatorConfig } from "../config";
import type { ModulaireCalculatorConfigData, OnderdeelConfig } from "../modulair-types";
import { evalueerOnderdeel, combineerOnderdelen } from "../modulair";
import { bouwResultaat } from "../result";

describe("MODULAIRE_CALCULATOR_TEMPLATES — elke Tool-template resolveert naar bestaande, geldige Onderdelen", () => {
  it("elk template heeft een uniek id", () => {
    const ids = MODULAIRE_CALCULATOR_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const template of MODULAIRE_CALCULATOR_TEMPLATES) {
    it(`"${template.naam}" verwijst alleen naar bestaande Onderdeel-templates`, () => {
      expect(template.onderdeelTemplateIds.length).toBeGreaterThan(0);
      for (const id of template.onderdeelTemplateIds) {
        expect(onderdeelTemplateById(id), `onbekend onderdeel-template-id: ${id}`).toBeDefined();
      }
    });

    it(`"${template.naam}" is als geheel geldig (geen FOUT-meldingen) en levert een positief totaal`, () => {
      const onderdelen: OnderdeelConfig[] = template.onderdeelTemplateIds.map((id, i) => {
        const ot = onderdeelTemplateById(id)!;
        const slice = ot.bouwSlice();
        return { id: `${id}-${i}`, naam: ot.naam, actief: true, order: i, ...slice };
      });
      const config: ModulaireCalculatorConfigData = { ...legeModulaireCalculatorConfig(), onderdelen };
      const fouten = valideerCalculatorConfig(config).filter((m) => m.ernst === "FOUT");
      expect(fouten, JSON.stringify(fouten)).toEqual([]);

      // Vult elk NUMMER/AANTAL-veld met een kleine positieve testwaarde en
      // elk PRODUCT_KEUZE-veld met een fictieve optie-id + prijs, zodat elk
      // Onderdeel een niet-triviaal bedrag oplevert — bevestigt dat de
      // combinatie (Deel 11 "Tool-Totaal") voor een echt samengesteld
      // template werkt, niet alleen voor het handmatige voorbeeld in
      // modulair.test.ts.
      const evaluaties = onderdelen.map((o) => {
        const waarden: Record<string, unknown> = {};
        const materiaalPrijzen: Record<string, number> = {};
        for (const veld of o.velden) {
          if (veld.soort === "NUMMER" || veld.soort === "AANTAL" || veld.soort === "OPPERVLAKTE") waarden[veld.id] = 5;
          else if (veld.soort === "AFMETINGEN") waarden[veld.id] = { lengte: 5, breedte: 4 };
          else if (veld.soort === "JA_NEE") waarden[veld.id] = true;
          else if (veld.soort === "DROPDOWN" || veld.soort === "RADIO") waarden[veld.id] = veld.opties[0]?.waarde;
          else if (veld.soort === "PRODUCT_KEUZE") {
            waarden[veld.id] = "test-optie";
            materiaalPrijzen["test-optie"] = 50;
          } else if (veld.soort === "MEERKEUZE") waarden[veld.id] = veld.opties.map((o2) => o2.waarde);
        }
        return evalueerOnderdeel(o, waarden, materiaalPrijzen);
      });
      const combined = combineerOnderdelen(evaluaties);
      const resultaat = bouwResultaat(combined, {
        btwPercentage: 21,
        resultaatInstellingen: config.resultaatInstellingen,
        heeftGeldigeInvoer: true,
      });
      expect(resultaat.totaal).toBeGreaterThan(0);
    });
  }
});
