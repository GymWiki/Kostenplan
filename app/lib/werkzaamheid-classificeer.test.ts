import { describe, expect, it } from "vitest";
import { classificeerOnderdeel } from "./werkzaamheid-classificeer";
import type { EngineTarieven } from "./werkzaamheid-engine";
import { werkzaamheidNaarOnderdeel } from "./werkzaamheid-engine";
import type { WerkzaamheidDraft } from "./werkzaamheid";

const tarieven: EngineTarieven = {
  materiaalEnabled: true, arbeidEnabled: true, arbeidTarief: 240,
  voorrijEnabled: false, voorrijTarief: 0, transportEnabled: false, transportTarief: 0,
};
const materialen = [{ id: "a", naam: "Dennen", prijs: 38 }, { id: "b", naam: "Hardhout", prijs: 62 }];
const draft: WerkzaamheidDraft = {
  naam: "Schutting", methode: "METER", productiviteit: "6", transportPerDag: false, bandbreedte: false,
  werktempoPerMateriaal: false, extras: [],
  materialen: materialen.map((m) => ({ sleutel: m.id, id: m.id, naam: m.naam, prijs: String(m.prijs), prijsMin: "", prijsMax: "", productiviteitOverride: "", isVoorbeeld: false })),
};

describe("classificeerOnderdeel", () => {
  it("een standaard gegenereerd onderdeel past", () => {
    const { onderdeel } = werkzaamheidNaarOnderdeel({ id: "w", draft, materialCategoryId: "c" }, tarieven);
    expect(classificeerOnderdeel(onderdeel, materialen, tarieven).soort).toBe("STANDAARD");
  });

  it("een afwijkende prijsregel is Aangepast en toont het prijsverschil", () => {
    const { onderdeel } = werkzaamheidNaarOnderdeel({ id: "w", draft, materialCategoryId: "c" }, tarieven);
    const aangepast = {
      ...onderdeel,
      regels: onderdeel.regels.map((r) =>
        r.id === "materiaal" && r.type === "PER_EENHEID" ? { ...r, prijsPerEenheid: { kind: "GETAL" as const, waarde: 50 } } : r
      ),
    };
    const c = classificeerOnderdeel(aangepast, materialen, tarieven);
    expect(c.soort).toBe("AANGEPAST");
    if (c.soort === "AANGEPAST" && c.kanOmzetten) {
      expect(c.verschillen.length).toBeGreaterThan(0);
      expect(c.verschillen[0].oud).not.toBeCloseTo(c.verschillen[0].nieuw, 2);
    } else throw new Error("moet omzetbaar zijn");
  });

  it("zonder herkenbare structuur is het Aangepast zonder omzetoptie", () => {
    const { onderdeel } = werkzaamheidNaarOnderdeel({ id: "w", draft, materialCategoryId: "c" }, tarieven);
    const c = classificeerOnderdeel({ ...onderdeel, velden: [] }, materialen, tarieven);
    expect(c).toMatchObject({ soort: "AANGEPAST", kanOmzetten: false });
  });
});
