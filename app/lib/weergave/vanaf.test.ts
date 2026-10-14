import { describe, expect, it } from "vitest";
import { BASIS_KOSTEN, optie, product, reken } from "@/app/lib/pricing/test-helpers";
import { maatInvoer, standaardVoorbeeldmaat, vanafPrijsCenten } from "./vanaf";

const bestrating = product({
  id: "p",
  eenheid: "m2",
  productiviteit: 8,
  transportkostenOverride: 50,
  materiaalCategorieen: [{ id: "c", naam: "Tegel", materialen: [optie("a", "Duur", 60), optie("b", "Goedkoop", 25), optie("c2", "Midden", 40, { prijsType: "BANDBREEDTE", prijsMin: 30, prijsMax: 50 })] }],
});
const afm = product({ id: "q", eenheid: "m2", sjabloon: "AFMETINGEN", sjabloonConfig: { metDiepte: false } });
const stuks = product({ id: "s", eenheid: "stuks", productiviteit: 2 });

describe("vanaf-prijs", () => {
  it("standaardmaat: 10 voor m/m², 1 voor stuks", () => {
    expect(standaardVoorbeeldmaat("m2")).toBe(10);
    expect(standaardVoorbeeldmaat("m1")).toBe(10);
    expect(standaardVoorbeeldmaat("stuks")).toBe(1);
  });

  it("is exact de rekenkern met het goedkoopste materiaal en de voorbeeldmaat, zonder voorrijkosten", () => {
    const echt = reken([bestrating], { hoeveelheden: { p: 10 }, materiaalKeuzes: { c: "b" } }, { voorrijEnabled: false });
    expect(vanafPrijsCenten(bestrating, BASIS_KOSTEN)).toBe(echt.totaalInclCenten);
  });

  it("met 'inclusief voorrijkosten' telt de voorrijpost mee", () => {
    const excl = vanafPrijsCenten(bestrating, BASIS_KOSTEN)!;
    const incl = vanafPrijsCenten(bestrating, BASIS_KOSTEN, { inclVoorrij: true })!;
    expect(incl).toBeGreaterThan(excl);
    const echt = reken([bestrating], { hoeveelheden: { p: 10 }, materiaalKeuzes: { c: "b" } });
    expect(incl).toBe(echt.totaalInclCenten);
  });

  it("nooit hoger dan een echte berekening met dezelfde maat, welk materiaal de klant ook kiest", () => {
    for (const maat of [1, 3.5, 10, 25, 120]) {
      const vanaf = vanafPrijsCenten(bestrating, BASIS_KOSTEN, { maat })!;
      for (const m of ["a", "b", "c2"]) {
        const echt = reken([bestrating], { hoeveelheden: { p: maat }, materiaalKeuzes: { c: m } });
        expect(vanaf).toBeLessThanOrEqual(echt.totaalInclCenten);
      }
    }
  });

  it("werkt met lengte × breedte en met stuks; ruimtes/artikelregels geven geen vanaf-prijs", () => {
    expect(maatInvoer(afm, 10)).toEqual({ sjabloonInvoer: { lengte: 10, breedte: 1, diepte: 1 } });
    const v = vanafPrijsCenten(afm, BASIS_KOSTEN)!;
    const echt = reken([afm], { sjabloonInvoer: { q: { lengte: 10, breedte: 1, diepte: 1 } } }, { voorrijEnabled: false });
    expect(v).toBe(echt.totaalInclCenten);
    expect(vanafPrijsCenten(stuks, BASIS_KOSTEN)).toBeGreaterThan(0);
    expect(vanafPrijsCenten({ ...stuks, sjabloon: "RUIMTES" }, BASIS_KOSTEN)).toBeNull();
    expect(vanafPrijsCenten({ ...stuks, sjabloon: "ARTIKELREGELS" }, BASIS_KOSTEN)).toBeNull();
  });

  it("eigen voorbeeldmaat; bandbreedte geeft de laagste prijs", () => {
    const klein = vanafPrijsCenten(bestrating, BASIS_KOSTEN, { maat: 5 })!;
    const groot = vanafPrijsCenten(bestrating, BASIS_KOSTEN, { maat: 50 })!;
    expect(groot).toBeGreaterThan(klein);
    const band = { ...BASIS_KOSTEN, bandbreedteModus: "TOTAAL" as const };
    const vanaf = vanafPrijsCenten(bestrating, band)!;
    const echt = reken([bestrating], { hoeveelheden: { p: 10 }, materiaalKeuzes: { c: "b" } }, { bandbreedteModus: "TOTAAL" });
    expect(vanaf).toBeLessThanOrEqual(echt.bandbreedte ? echt.bandbreedte.min.totaalInclCenten : echt.totaalInclCenten);
  });
});
