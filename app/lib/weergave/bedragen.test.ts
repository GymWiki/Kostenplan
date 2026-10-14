import { describe, expect, it } from "vitest";
import { BASIS_KOSTEN, optie, product, reken } from "@/app/lib/pricing/test-helpers";
import { onderdeelInclCenten, onderdeelIsGeldig, overigeKostenInclCenten } from "./bedragen";

const a = product({ id: "a", eenheid: "m2", materiaalCategorieen: [{ id: "ac", naam: "M", verplicht: true, materialen: [optie("a1", "x", 33.33), optie("a2", "y", 41.17)] }] });
const b = product({ id: "b", eenheid: "stuks", productiviteit: 3, materiaalCategorieen: [{ id: "bc", naam: "M", materialen: [optie("b1", "z", 12.37)] }] });

describe("bedragen per onderdeel", () => {
  it("onderdelen + overige kosten zijn exact het totaal (ook met vaste kosten per aanvraag en afrondingsgevallen)", () => {
    for (const vasteKosten of ["PER_ONDERDEEL", "PER_AANVRAAG"] as const) {
      for (const qty of [1, 3.3, 7.77, 19]) {
        const r = reken([a, b], { hoeveelheden: { a: qty, b: 2 }, materiaalKeuzes: { ac: "a1" } }, { transportTarief: 12.34, voorrijTarief: 17.65 }, { vasteKosten });
        const som = onderdeelInclCenten(r, "a") + onderdeelInclCenten(r, "b") + overigeKostenInclCenten(r);
        expect(som).toBe(r.totaalInclCenten);
      }
    }
  });

  it("een onderdeel is pas geldig met hoeveelheid en een gemaakte verplichte keuze", () => {
    const zonderKeuze = reken([a], { hoeveelheden: { a: 5 } }, BASIS_KOSTEN);
    expect(onderdeelIsGeldig(zonderKeuze, "a")).toBe(false);
    const met = reken([a], { hoeveelheden: { a: 5 }, materiaalKeuzes: { ac: "a2" } }, BASIS_KOSTEN);
    expect(onderdeelIsGeldig(met, "a")).toBe(true);
    expect(onderdeelIsGeldig(reken([a], { hoeveelheden: { a: 0 }, materiaalKeuzes: { ac: "a2" } }, BASIS_KOSTEN), "a")).toBe(false);
    expect(onderdeelIsGeldig(met, "bestaat-niet")).toBe(false);
  });
});
