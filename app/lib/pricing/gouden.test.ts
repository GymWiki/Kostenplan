import { describe, expect, it } from "vitest";
import gouden from "./gouden-voorbeelden.json";
import { berekenPrijs } from "./engine";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { BASIS_KOSTEN, optie, product, type TestProduct } from "./test-helpers";
import type { CalcCostSettings } from "@/app/lib/calculate";

// De voorbeelden in gouden-voorbeelden.json zijn met de hand uitgerekend (de uitleg staat erbij). Deze test
// controleert dat de rekenkern precies die bedragen geeft.

type Voorbeeld = (typeof gouden.voorbeelden)[number] & { opties?: { kor?: boolean; vasteKosten?: "PER_ONDERDEEL" | "PER_AANVRAAG" } };

function bouwProduct(p: Record<string, unknown>): TestProduct {
  const { materialen, categorieen, extras, ...rest } = p as { materialen?: Parameters<typeof optie>[number][]; categorieen?: { id: string; naam: string; materialen: Record<string, unknown>[] }[]; extras?: TestProduct["extraOpties"] } & Record<string, unknown>;
  const maakOptie = (m: Record<string, unknown>) => optie(m.id as string, m.naam as string, m.prijs as number, m as never);
  const cats = categorieen
    ? categorieen.map((c) => ({ id: c.id, naam: c.naam, materialen: c.materialen.map(maakOptie) }))
    : [{ id: `${rest.id}-cat`, naam: "Materiaal", materialen: ((materialen ?? []) as unknown as Record<string, unknown>[]).map(maakOptie) }];
  return product({ ...(rest as object), id: rest.id as string, materiaalCategorieen: cats, extraOpties: extras ?? [] } as never);
}

describe("gouden voorbeelden (met de hand uitgerekend)", () => {
  for (const v of gouden.voorbeelden as Voorbeeld[]) {
    it(v.titel, () => {
      const producten = v.producten.map((p) => bouwProduct(p as Record<string, unknown>));
      const kosten = { ...BASIS_KOSTEN, bandbreedteModus: "GEEN", ...(("kosten" in v ? v.kosten : {}) as Partial<CalcCostSettings>) } as CalcCostSettings;
      const r = berekenPrijs(configVanProducten(producten, kosten, v.opties ?? {}), invoerVanKlant({ producten, ...(v.invoer as object) }));
      expect(r.subtotaalExclCenten).toBe(v.verwacht.subtotaalExclCenten);
      expect(r.btwCenten).toBe(v.verwacht.btwCenten);
      expect(r.totaalInclCenten).toBe(v.verwacht.totaalInclCenten);
      if ("bandbreedte" in v.verwacht && v.verwacht.bandbreedte) {
        expect(r.bandbreedte?.min.totaalInclCenten).toBe(v.verwacht.bandbreedte.minInclCenten);
        expect(r.bandbreedte?.max.totaalInclCenten).toBe(v.verwacht.bandbreedte.maxInclCenten);
      }
      if ("regels" in v.verwacht && v.verwacht.regels) {
        expect(r.regels.map((x) => [x.soort, x.bedragExclCenten])).toEqual(v.verwacht.regels);
      }
    });
  }
});
