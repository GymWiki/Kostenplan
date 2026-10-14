import { describe, expect, it } from "vitest";
import {
  arbeidVraag,
  bouwPreviewProduct,
  methodeNaarInstelling,
  methodeVanProduct,
  stap2IsGeldig,
  valideerMaterialen,
  voorbeeldHoeveelheidVoor,
  type MateriaalRij,
  type WerkzaamheidDraft,
} from "./werkzaamheid";
import { calculateBreakdown, type CalcCostSettings } from "./calculate";

const rij = (naam: string, prijs: string, extra: Partial<MateriaalRij> = {}): MateriaalRij => ({
  sleutel: naam,
  naam,
  prijs,
  prijsMin: prijs,
  prijsMax: prijs,
  productiviteitOverride: "",
  isVoorbeeld: false,
  ...extra,
});

const draft = (extra: Partial<WerkzaamheidDraft> = {}): WerkzaamheidDraft => ({
  naam: "Schutting",
  methode: "METER",
  productiviteit: "6",
  transportPerDag: false,
  bandbreedte: false,
  werktempoPerMateriaal: false,
  materialen: [rij("Grenen schermen 180 cm", "38"), rij("Hardhouten planken", "62")],
  ...extra,
});

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

describe("methodes", () => {
  it("elke methode is terug te vinden uit zijn eigen instelling", () => {
    for (const m of ["METER", "M2", "LENGTE_BREEDTE", "STUK"] as const) {
      expect(methodeVanProduct(methodeNaarInstelling(m))).toBe(m);
    }
  });

  it("herkent bestaande producten die niet in de vier methodes passen", () => {
    expect(methodeVanProduct({ sjabloon: "RUIMTES", eenheid: "m2", sjabloonConfig: {} })).toBeNull();
    expect(methodeVanProduct({ sjabloon: "ARTIKELREGELS", eenheid: "stuks", sjabloonConfig: {} })).toBeNull();
    expect(methodeVanProduct({ sjabloon: "ENKELE_HOEVEELHEID", eenheid: "m3", sjabloonConfig: {} })).toBeNull();
    expect(methodeVanProduct({ sjabloon: "ENKELE_HOEVEELHEID", eenheid: "uur", sjabloonConfig: {} })).toBeNull();
    expect(methodeVanProduct({ sjabloon: "AFMETINGEN", eenheid: "m3", sjabloonConfig: { metDiepte: true } })).toBeNull();
  });

  it("vraagt de arbeid in gewone taal", () => {
    expect(arbeidVraag("Schutting", "m1", "DAGDEEL")).toBe("Hoeveel m schutting maak je in een dagdeel?");
    expect(arbeidVraag("Graszoden", "m2", "DAGDEEL")).toBe("Hoeveel m² graszoden maak je in een dagdeel?");
    expect(arbeidVraag("", "stuks", "DAG")).toBe("Hoeveel stuk dit werk maak je op een dag?");
  });

  it("voorbeeldhoeveelheid is 20, of 1 stuk", () => {
    expect(voorbeeldHoeveelheidVoor("m1")).toBe(20);
    expect(voorbeeldHoeveelheidVoor("stuks")).toBe(1);
  });
});

describe("validatie", () => {
  it("accepteert een complete draft", () => {
    expect(valideerMaterialen(draft())).toEqual([]);
    expect(stap2IsGeldig(draft())).toBe(true);
  });

  it("wijst lege namen, lege prijzen en geen materialen af", () => {
    expect(valideerMaterialen(draft({ materialen: [rij("", "10")] }))[0].veld).toBe("naam");
    expect(valideerMaterialen(draft({ materialen: [rij("A", "")] }))[0].veld).toBe("prijs");
    expect(stap2IsGeldig(draft({ materialen: [] }))).toBe(false);
    expect(stap2IsGeldig(draft({ naam: "  " }))).toBe(false);
    expect(stap2IsGeldig(draft({ methode: null }))).toBe(false);
  });

  it("een negatieve of onrealistisch hoge materiaalprijs geeft een Nederlandse melding (geen stille terugval)", () => {
    expect(valideerMaterialen(draft({ materialen: [rij("A", "-5")] }))[0].melding).toBe("Een prijs onder nul kan niet. Vul 0 of meer in.");
    expect(valideerMaterialen(draft({ materialen: [rij("A", "abc")] }))[0].melding).toMatch(/^Vul een geldige prijs in/);
    expect(valideerMaterialen(draft({ materialen: [rij("A", "1000000000")] }))[0].melding).toMatch(/erg hoog/);
    expect(valideerMaterialen(draft({ materialen: [rij("A", "100000")] }))).toEqual([]);
    expect(valideerMaterialen(draft({ materialen: [rij("A", "12.50")] }))).toEqual([]);
  });

  it("accepteert komma's in prijzen", () => {
    expect(valideerMaterialen(draft({ materialen: [rij("A", "7,5")] }))).toEqual([]);
  });

  it("bij bandbreedte moet de hoogste prijs hoger zijn", () => {
    const d = draft({ bandbreedte: true, materialen: [rij("A", "0", { prijsMin: "60", prijsMax: "40" })] });
    expect(valideerMaterialen(d).some((f) => f.veld === "prijsMax")).toBe(true);
  });
});

describe("preview-product met de echte rekenlogica", () => {
  it("geeft het rekenvoorbeeld uit het ontwerp: 20 m schutting = € 1.670", () => {
    const product = bouwPreviewProduct({ toolId: "t", draft: draft() });
    const b = calculateBreakdown({
      products: [product],
      productQty: { [product.id]: 20 },
      materialSelections: {},
      extraSelections: {},
      costSettings: kosten,
    });
    // materiaal 20 × 38 = 760 (eerste optie), arbeid 20/6 × 240 = 800, voorrij 45, transport 65
    // (geen keuze gemaakt → de klant kiest; vul de selectie hier in)
    const sel = { [product.materiaalCategorieen[0].id]: product.materiaalCategorieen[0].materialen[0].id };
    const b2 = calculateBreakdown({
      products: [product],
      productQty: { [product.id]: 20 },
      materialSelections: sel,
      extraSelections: {},
      costSettings: kosten,
    });
    expect(b.materiaalkosten).toBe(0);
    expect(b2.materiaalkosten).toBe(760);
    expect(b2.arbeidskosten).toBeCloseTo(800, 5);
    expect(b2.subtotaal).toBeCloseTo(1670, 5);
  });

  it("werktempo per materiaal telt alleen mee als de optie aan staat", () => {
    const d = draft({ materialen: [rij("A", "10", { productiviteitOverride: "3" }), rij("B", "10")] });
    expect(bouwPreviewProduct({ toolId: "t", draft: d }).materiaalCategorieen[0].materialen[0].productiviteitOverride).toBeNull();
    const aan = bouwPreviewProduct({ toolId: "t", draft: { ...d, werktempoPerMateriaal: true } });
    expect(aan.materiaalCategorieen[0].materialen[0].productiviteitOverride).toBe(3);
  });

  it("bandbreedte maakt min/max-prijzen", () => {
    const d = draft({ bandbreedte: true, materialen: [rij("A", "0", { prijsMin: "30", prijsMax: "40" })] });
    const o = bouwPreviewProduct({ toolId: "t", draft: d }).materiaalCategorieen[0].materialen[0];
    expect(o.prijsType).toBe("BANDBREEDTE");
    expect([o.prijsMin, o.prijsMax]).toEqual([30, 40]);
  });
});

import { berekenKostenOpbouw, prijsRange } from "./werkzaamheid-kosten";

describe("kostenopbouw (alleen voor jou)", () => {
  const product = bouwPreviewProduct({ toolId: "t", draft: draft() });
  const eerste = product.materiaalCategorieen[0].materialen[0].id;

  it("komt overeen met het ontwerp: € 760 + € 800 + € 45 + € 65 = € 1.670", () => {
    const o = berekenKostenOpbouw({ product, optieId: eerste, hoeveelheid: 20, costSettings: kosten });
    expect(o.materiaal).toBe(760);
    expect(o.arbeid).toBeCloseTo(800, 5);
    expect(o.arbeidstijd).toBeCloseTo(3.333, 2);
    expect(o.arbeidTarief).toBe(240);
    expect(o.voorrijkosten).toBe(45);
    expect(o.transport).toBe(65);
    expect(o.totaal).toBeCloseTo(1670, 5);
  });

  it("rekent met het gekozen materiaal", () => {
    const tweede = product.materiaalCategorieen[0].materialen[1].id;
    expect(berekenKostenOpbouw({ product, optieId: tweede, hoeveelheid: 20, costSettings: kosten }).materiaal).toBe(1240);
  });

  it("transport per dag telt begonnen dagen", () => {
    const p = bouwPreviewProduct({ toolId: "t", draft: draft({ transportPerDag: true }) });
    const o = berekenKostenOpbouw({ product: p, optieId: null, hoeveelheid: 20, costSettings: kosten });
    expect(o.transportDagen).toBe(2);
    expect(o.transport).toBe(130);
  });

  it("prijsrange over alle materialen", () => {
    expect(prijsRange(product)).toEqual({ min: 38, max: 62 });
    const band = bouwPreviewProduct({ toolId: "t", draft: draft({ bandbreedte: true, materialen: [rij("A", "0", { prijsMin: "30", prijsMax: "45" })] }) });
    expect(prijsRange(band)).toEqual({ min: 30, max: 45 });
  });
});

import { zetBandbreedte } from "./werkzaamheid";

describe("bandbreedte aan en uit", () => {
  it("maakt van een vaste prijs een bandbreedte van −10% tot +10% en weer terug", () => {
    const aan = zetBandbreedte(draft({ materialen: [rij("A", "100")] }), true);
    expect(aan.bandbreedte).toBe(true);
    expect([aan.materialen[0].prijsMin, aan.materialen[0].prijsMax]).toEqual(["90", "110"]);
    const uit = zetBandbreedte(aan, false);
    expect(uit.bandbreedte).toBe(false);
    expect(uit.materialen[0].prijs).toBe("100");
  });

  it("verandert niets als de stand al klopt", () => {
    const d = draft();
    expect(zetBandbreedte(d, false)).toBe(d);
  });
});
