import { describe, expect, it } from "vitest";
import { kenmerkenVan, regressieVoorTool, samenvatting, type RegressieTool } from "./regressie";
import { BASIS_KOSTEN, optie, product } from "./test-helpers";

const tool: RegressieTool = {
  id: "t1",
  naam: "Tuinaanleg",
  bedrijf: "Test",
  company: { standaardArbeidTariefUur: 55, standaardVoorrijTarief: 35, standaardBtwPercentage: 21 },
  costSettings: { ...BASIS_KOSTEN, gebruiktAccountArbeidTarief: false, gebruiktAccountVoorrijTarief: false, gebruiktAccountBtw: false },
  calculatorConfig: null,
  products: [
    product({ id: "schutting", naam: "Schutting", eenheid: "m1", productiviteit: 8, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Douglas", 85.5), optie("m2", "Hardhout", 135)] }, { id: "c2", naam: "Palen", materialen: [optie("p", "Paal", 14.9, { stapgrootte: 1.8 })] }], extraOpties: [{ id: "e", naam: "Poort", prijs: 250, type: "PER_STUK" }] }),
    product({ id: "terras", naam: "Terras", eenheid: "m2", sjabloon: "AFMETINGEN", sjabloonConfig: { metDiepte: false }, productiviteit: 6, materiaalCategorieen: [{ id: "c3", naam: "Tegel", materialen: [optie("t", "Klinker", 48.75)] }] }),
  ],
};

describe("regressierapport", () => {
  it("rekent voor elk onderdeel meerdere scenario's en wijkt hoogstens door afronding af", () => {
    const rijen = regressieVoorTool(tool);
    expect(rijen.length).toBeGreaterThan(10);
    expect(rijen.some((r) => r.scenario.startsWith("Alle onderdelen samen"))).toBe(true);
    const s = samenvatting(rijen);
    expect(s.onderzoeken).toBe(0);
    expect(s.gelijk + s.afronding).toBe(s.totaal);
    expect(Math.max(...rijen.map((r) => Math.abs(r.verschilCenten)))).toBeLessThanOrEqual(5);
  });

  it("meldt de kenmerken van de rekentool", () => {
    expect(kenmerkenVan(tool)).toMatchObject({ onderdelen: 2, meerdereCategorieen: 1, vasteKostenPerOnderdeel: true, formules: false });
  });
});
