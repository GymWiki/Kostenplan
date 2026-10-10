import { describe, expect, it } from "vitest";
import { calculateBreakdown, type CalcCostSettings } from "./calculate";
import { evalueerOnderdeel, combineerOnderdelen } from "./calculator-engine";
import { bouwPreviewProduct, type ExtraRij, type MateriaalRij, type Methode, type WerkzaamheidDraft } from "./werkzaamheid";
import {
  MATERIAAL_VELD_ID,
  extraVeldId,
  werkzaamheidNaarOnderdeel,
  werkzaamhedenNaarConfig,
  type EngineTarieven,
} from "./werkzaamheid-engine";

const kosten: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTariefUur: 45,
  arbeidTariefDagdeel: 240,
  arbeidTariefDag: 480,
  arbeidAfronden: false,
  transportEnabled: true,
  transportTarief: 65,
  voorrijEnabled: true,
  voorrijTarief: 45,
  materiaalEnabled: true,
  btwPercentage: 21,
  bandbreedteModus: "GEEN",
  bandbreedteMargeOmlaag: 10,
  bandbreedteMargeOmhoog: 10,
};
const tarieven: EngineTarieven = {
  materiaalEnabled: true,
  arbeidEnabled: true,
  arbeidTarief: 240,
  voorrijEnabled: true,
  voorrijTarief: 45,
  transportEnabled: true,
  transportTarief: 65,
};

const rij = (id: string, prijs: string, extra: Partial<MateriaalRij> = {}): MateriaalRij => ({
  sleutel: id,
  id,
  naam: id,
  prijs,
  prijsMin: prijs,
  prijsMax: prijs,
  productiviteitOverride: "",
  isVoorbeeld: false,
  ...extra,
});
const extra = (id: string, prijs: string, type: ExtraRij["type"], altijd = false): ExtraRij => ({ sleutel: id, id, naam: id, prijs, type, altijd });

function draft(methode: Methode, extra_: Partial<WerkzaamheidDraft> = {}): WerkzaamheidDraft {
  return {
    naam: "Test",
    methode,
    productiviteit: "6",
    transportPerDag: false,
    bandbreedte: false,
    werktempoPerMateriaal: false,
    materialen: [rij("a", "38"), rij("b", "62")],
    extras: [],
    ...extra_,
  };
}

// Dezelfde invoer door de huidige motor én door de engine-vertaling.
function vergelijk(
  d: WerkzaamheidDraft,
  { hoeveelheid, optie, extraKeuze = {}, kostenOverride = kosten, tarievenOverride = tarieven }: {
    hoeveelheid: number;
    optie: string;
    extraKeuze?: Record<string, number>;
    kostenOverride?: CalcCostSettings;
    tarievenOverride?: EngineTarieven;
  }
) {
  const product = bouwPreviewProduct({ toolId: "t", draft: d });
  const categorie = product.materiaalCategorieen[0];
  const motor = calculateBreakdown({
    products: [product],
    productQty: { [product.id]: hoeveelheid },
    materialSelections: { [categorie.id]: optie },
    extraSelections: Object.fromEntries(Object.entries(extraKeuze).map(([k, v]) => [k, v])),
    costSettings: kostenOverride,
  }).subtotaal;

  const { onderdeel } = werkzaamheidNaarOnderdeel(
    { id: "w1", draft: d, materialCategoryId: categorie.id },
    tarievenOverride,
    { metVasteKosten: true }
  );
  const waarden: Record<string, unknown> = { [MATERIAAL_VELD_ID]: optie };
  if (d.methode === "LENGTE_BREEDTE") waarden.afmeting = { lengte: hoeveelheid / 4, breedte: 4 };
  else waarden.hoeveelheid = hoeveelheid;
  for (const [sleutel, n] of Object.entries(extraKeuze)) {
    const e = d.extras?.find((x) => x.sleutel === sleutel);
    waarden[extraVeldId(sleutel)] = e?.type === "PER_STUK" ? n : n > 0;
  }
  const prijzen = Object.fromEntries(d.materialen.map((m) => [m.id!, Number(m.prijs.replace(",", "."))]));
  const engine = evalueerOnderdeel(onderdeel, waarden, prijzen).subtotaal;
  return { motor, engine };
}

describe("werkzaamheid → engine: zelfde totaal als de huidige motor", () => {
  it.each<Methode>(["METER", "M2", "LENGTE_BREEDTE", "STUK"])("rekenmethode %s", (methode) => {
    for (const hoeveelheid of [1, 7, 20, 83.5]) {
      for (const optie of ["a", "b"]) {
        const { motor, engine } = vergelijk(draft(methode), { hoeveelheid, optie });
        expect(engine).toBeCloseTo(motor, 6);
      }
    }
  });

  it("het ontwerpvoorbeeld: 20 m schutting = € 1.670", () => {
    const { motor, engine } = vergelijk(draft("METER"), { hoeveelheid: 20, optie: "a" });
    expect(motor).toBeCloseTo(1670, 5);
    expect(engine).toBeCloseTo(1670, 5);
  });

  it("werktempo per materiaal", () => {
    const d = draft("M2", {
      werktempoPerMateriaal: true,
      materialen: [rij("a", "38", { productiviteitOverride: "3" }), rij("b", "62")],
    });
    for (const optie of ["a", "b"]) {
      const { motor, engine } = vergelijk(d, { hoeveelheid: 20, optie });
      expect(engine).toBeCloseTo(motor, 6);
    }
    expect(vergelijk(d, { hoeveelheid: 20, optie: "a" }).motor).not.toBeCloseTo(vergelijk(d, { hoeveelheid: 20, optie: "b" }).motor - 24 * 20, 1);
  });

  it("extra vraag (ja/nee per eenheid) en extra per stuk", () => {
    const d = draft("M2", { extras: [extra("afvoer", "4", "PER_EENHEID"), extra("poort", "145", "PER_STUK")] });
    for (const keuze of <Record<string, number>[]>[{}, { afvoer: 1 }, { poort: 2 }, { afvoer: 1, poort: 3 }]) {
      const { motor, engine } = vergelijk(d, { hoeveelheid: 20, optie: "a", extraKeuze: keuze });
      expect(engine).toBeCloseTo(motor, 6);
    }
  });

  it("toeslag: vast bedrag en per eenheid, zonder keuze van de klant", () => {
    const d = draft("METER", { extras: [extra("t1", "150", "PER_STUK", true), extra("t2", "2,5", "PER_EENHEID", true)] });
    const { motor, engine } = vergelijk(d, { hoeveelheid: 12, optie: "b" });
    expect(engine).toBeCloseTo(motor, 6);
    const zonder = vergelijk(draft("METER"), { hoeveelheid: 12, optie: "b" }).motor;
    expect(motor - zonder).toBeCloseTo(150 + 2.5 * 12, 6);
  });

  it("uitgeschakelde arbeid en vaste kosten", () => {
    const k = { ...kosten, arbeidEnabled: false, voorrijEnabled: false };
    const t = { ...tarieven, arbeidEnabled: false, voorrijEnabled: false };
    const { motor, engine } = vergelijk(draft("M2"), { hoeveelheid: 20, optie: "a", kostenOverride: k, tarievenOverride: t });
    expect(engine).toBeCloseTo(motor, 6);
  });

  it("zonder werktempo geen arbeid", () => {
    const { motor, engine } = vergelijk(draft("M2", { productiviteit: "" }), { hoeveelheid: 20, optie: "a" });
    expect(engine).toBeCloseTo(motor, 6);
    expect(motor).toBeCloseTo(20 * 38 + 45 + 65, 6);
  });
});

describe("beperkingen van de engine", () => {
  it("meldt wat de engine niet kan uitdrukken", () => {
    const r = werkzaamheidNaarOnderdeel(
      { id: "w", draft: draft("M2", { transportPerDag: true, bandbreedte: true }), materialCategoryId: "c", arbeidAfronden: true },
      tarieven
    );
    expect(r.beperkingen).toEqual(["transport per dag", "arbeid afronden", "bandbreedte per materiaal"]);
  });

  it("weigert een werkzaamheid zonder rekenmethode", () => {
    expect(() => werkzaamheidNaarOnderdeel({ id: "w", draft: draft("M2", { methode: null }), materialCategoryId: "c" }, tarieven)).toThrow();
  });
});

describe("hele rekentool", () => {
  it("telt voorrijkosten en transport één keer per aanvraag (de huidige motor telt ze per werkzaamheid)", () => {
    const d1 = draft("M2", { naam: "Terras" });
    const d2 = draft("METER", { naam: "Schutting" });
    const { config } = werkzaamhedenNaarConfig(
      [
        { id: "w1", draft: d1, materialCategoryId: "c1" },
        { id: "w2", draft: d2, materialCategoryId: "c2" },
      ],
      tarieven
    );
    expect(config.onderdelen.map((o) => o.naam)).toEqual(["Terras", "Schutting", "Vaste kosten"]);
    const prijzen = { a: 38, b: 62 };
    const evaluaties = config.onderdelen.map((o) =>
      evalueerOnderdeel(o, o.id === "w1" ? { hoeveelheid: 20, materiaal: "a" } : o.id === "w2" ? { hoeveelheid: 10, materiaal: "a" } : {}, prijzen)
    );
    const engineTotaal = combineerOnderdelen(evaluaties).subtotaal;
    // Per werkzaamheid zonder vaste kosten + één keer 45 + 65:
    const zonderVast = (naam: "Terras" | "Schutting", q: number) => {
      const d = naam === "Terras" ? d1 : d2;
      const p = bouwPreviewProduct({ toolId: "t", draft: d });
      return calculateBreakdown({
        products: [p],
        productQty: { [p.id]: q },
        materialSelections: { [p.materiaalCategorieen[0].id]: "a" },
        extraSelections: {},
        costSettings: { ...kosten, voorrijEnabled: false, transportEnabled: false },
      }).subtotaal;
    };
    expect(engineTotaal).toBeCloseTo(zonderVast("Terras", 20) + zonderVast("Schutting", 10) + 45 + 65, 6);
  });

  it("bevestigt het verschil met de motor: twee werkzaamheden in één aanvraag betalen daar twee keer vaste kosten", () => {
    // Zelfde productid is hier niet toegestaan; twee preview-producten krijgen allebei id "voorbeeld-product".
    const maak = (naam: string) => ({ ...bouwPreviewProduct({ toolId: "t", draft: draft("M2", { naam }) }), id: naam });
    const p1 = maak("p1");
    const p2 = maak("p2");
    const b = calculateBreakdown({
      products: [p1, p2],
      productQty: { p1: 10, p2: 10 },
      materialSelections: { [p1.materiaalCategorieen[0].id]: "a" },
      extraSelections: {},
      costSettings: kosten,
    });
    expect(b.voorrijkosten).toBe(90);
    expect(b.transportkosten).toBe(130);
  });
});
