import { describe, expect, it } from "vitest";
import {
  arbeidTariefVoorStapEenheid,
  bedragTop,
  berekenProductKosten,
  calculateBreakdown,
  calculateBreakdownRange,
  geselecteerdeMateriaalOptieId,
  serviceVastePrijs,
  type CalcCostSettings,
  type CalcProduct,
  type CalcService,
} from "./calculate";

// arbeidAfronden staat hier bewust aan (i.p.v. de nieuwe standaard uit) zodat
// de bestaande, hier al lang aanwezige testverwachtingen (bijv. 1.2 dagdeel
// -> 2 dagdelen) geldig blijven — het continue (niet-afgeronde) gedrag heeft
// zijn eigen describe-blok hieronder.
const baseCostSettings: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTariefUur: 50,
  arbeidTariefDagdeel: 200,
  arbeidTariefDag: 380,
  arbeidAfronden: true,
  transportEnabled: true,
  transportTarief: 0,
  voorrijEnabled: true,
  voorrijTarief: 35,
  materiaalEnabled: true,
  btwPercentage: 21,
  bandbreedteModus: "GEEN",
  bandbreedteMargeOmlaag: 10,
  bandbreedteMargeOmhoog: 10,
};

function maakDienst(overrides: Partial<CalcService> = {}): CalcService {
  return {
    id: "dienst-1",
    prijsType: "UURTARIEF",
    uurtarief: 45,
    geschatteUren: 4,
    vastePrijs: 0,
    bandbreedteType: "VAST",
    geschatteUrenMin: null,
    geschatteUrenMax: null,
    vastePrijsMin: null,
    vastePrijsMax: null,
    ...overrides,
  };
}

function maakProduct(overrides: Partial<CalcProduct> = {}): CalcProduct {
  return {
    id: "product-1",
    productiviteit: 10,
    arbeidTariefOverride: null,
    transportkostenOverride: 25,
    transportMeeschalend: false,
    voorrijkostenOverride: null,
    voorrijMeeschalend: false,
    materiaalCategorieen: [
      {
        id: "categorie-1",
        materialen: [
          {
            id: "materiaal-1",
            prijs: 20,
            prijsType: "VAST",
            prijsMin: null,
            prijsMax: null,
            stapgrootte: null,
            productiviteitOverride: null,
          },
        ],
      },
    ],
    extraOpties: [],
    ...overrides,
  };
}

describe("calculateBreakdown (basispad)", () => {
  it("rekent arbeid, materiaal, transport en voorrijkosten correct op", () => {
    const product = maakProduct();
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // arbeidstijd = 12/10 = 1.2 dagdeel -> ceil naar 2 dagdelen -> 2*200=400
    expect(result.arbeidskosten).toBe(400);
    // materiaalkosten = 12 * 20 = 240 (geen stapgrootte, geen marge meer)
    expect(result.materiaalkosten).toBe(240);
    expect(result.transportkosten).toBe(25);
    expect(result.voorrijkosten).toBe(35);
    expect(result.subtotaal).toBe(700);
    expect(result.btw).toBeCloseTo(147, 6);
    expect(result.totaal).toBeCloseTo(847, 6);
    expect(result.heeftSelectie).toBe(true);
  });

  it("rondt materiaalhoeveelheid naar boven af op stapgrootte", () => {
    const product = maakProduct({
      materiaalCategorieen: [
        {
          id: "categorie-1",
          materialen: [
            {
              id: "materiaal-1",
              prijs: 20,
              prijsType: "VAST",
              prijsMin: null,
              prijsMax: null,
              stapgrootte: 1.8,
              productiviteitOverride: null,
            },
          ],
        },
      ],
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // ceil(12/1.8)*1.8 = ceil(6.667)*1.8 = 7*1.8 = 12.6 -> 12.6*20 = 252
    expect(result.materiaalkosten).toBeCloseTo(252, 6);
  });

  it("geeft 0 en heeftSelectie=false zonder selectie", () => {
    const result = calculateBreakdown({
      services: [maakDienst()],
      products: [maakProduct()],
      serviceSelected: {},
      productQty: {},
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });
    expect(result.heeftSelectie).toBe(false);
    expect(result.totaal).toBe(0);
    expect(result.voorrijkosten).toBe(0);
  });

  it("materiaalcategorie met precies één optie wordt automatisch geselecteerd", () => {
    const product = maakProduct();
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: {}, // geen expliciete keuze — er is maar 1 optie
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(240);
  });

  it("een categorie met meerdere opties telt niet mee zonder expliciete keuze", () => {
    const product = maakProduct({
      materiaalCategorieen: [
        {
          id: "categorie-1",
          materialen: [
            { id: "a", prijs: 20, prijsType: "VAST", prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null },
            { id: "b", prijs: 30, prijsType: "VAST", prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null },
          ],
        },
      ],
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(0);
  });
});

describe("calculateBreakdown — productiviteit per materiaal", () => {
  it("gebruikt de productiviteitOverride van de geselecteerde primaire optie i.p.v. die van het product", () => {
    const product = maakProduct({
      productiviteit: 10,
      materiaalCategorieen: [
        {
          id: "categorie-1",
          materialen: [
            {
              id: "materiaal-1",
              prijs: 20,
              prijsType: "VAST",
              prijsMin: null,
              prijsMax: null,
              stapgrootte: null,
              productiviteitOverride: 5, // legt trager — halve productiviteit
            },
          ],
        },
      ],
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 10 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // 10 / 5 = 2 dagdelen (geen afronding nodig) * 200 = 400
    expect(result.arbeidskosten).toBe(400);
  });

  it("valt terug op de productiviteit van het product als het materiaal geen override heeft", () => {
    const product = maakProduct({ productiviteit: 10 });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 10 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // 10 / 10 = 1 dagdeel * 200 = 200
    expect(result.arbeidskosten).toBe(200);
  });
});

describe("calculateBreakdown — transport en voorrijkosten (meeschalend of vast)", () => {
  it("telt transport en voorrij als vaste post per project (standaard, niet meeschalend)", () => {
    const product = maakProduct({
      productiviteit: null,
      transportkostenOverride: 25,
      voorrijkostenOverride: 15,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 100 }, // grote hoeveelheid, mag niets uitmaken
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.transportkosten).toBe(25);
    expect(result.voorrijkosten).toBe(15);
  });

  it("schaalt transport en voorrij mee met de hoeveelheid als dat aanstaat", () => {
    const product = maakProduct({
      productiviteit: null,
      transportkostenOverride: 2,
      transportMeeschalend: true,
      voorrijkostenOverride: 1,
      voorrijMeeschalend: true,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.transportkosten).toBe(24); // 12 * 2
    expect(result.voorrijkosten).toBe(12); // 12 * 1
  });

  it("valt terug op de company-instelling als het product geen eigen bedrag heeft", () => {
    const product = maakProduct({
      productiviteit: null,
      transportkostenOverride: null,
      voorrijkostenOverride: null,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: { ...baseCostSettings, transportTarief: 50 },
    });

    expect(result.transportkosten).toBe(50);
    expect(result.voorrijkosten).toBe(35);
  });

  it("rekent voorrijkosten één keer voor een dienst-alleen mandje, onafhankelijk van producten", () => {
    const result = calculateBreakdown({
      services: [maakDienst()],
      products: [],
      serviceSelected: { "dienst-1": true },
      productQty: {},
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.voorrijkosten).toBe(35);
  });
});

describe("calculateBreakdown — arbeid afronden (aan/uit)", () => {
  it("rekent continu door als arbeidAfronden uitstaat (standaard)", () => {
    const product = maakProduct({ productiviteit: 10 });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: { ...baseCostSettings, arbeidAfronden: false },
    });

    // 12/10 = 1.2 dagdeel * 200 = 240 (geen afronding)
    expect(result.arbeidskosten).toBe(240);
  });

  it("rondt naar boven af op hele stappen als arbeidAfronden aanstaat", () => {
    const product = maakProduct({ productiviteit: 10 });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: { ...baseCostSettings, arbeidAfronden: true },
    });

    // 12/10 = 1.2 -> ceil naar 2 dagdelen * 200 = 400
    expect(result.arbeidskosten).toBe(400);
  });
});

describe("calculateBreakdownRange — modus GEEN", () => {
  it("geeft exact dezelfde uitkomst als calculateBreakdown() zelf, als één vast bedrag", () => {
    const product = maakProduct();
    const args = {
      services: [maakDienst()],
      products: [product],
      serviceSelected: { "dienst-1": true },
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    };

    const direct = calculateBreakdown(args);
    const range = calculateBreakdownRange(args);

    expect(range.modus).toBe("GEEN");
    expect(range.totaal).toBe(direct.totaal);
    expect(range.subtotaal).toBe(direct.subtotaal);
    expect(range.arbeidskosten).toBe(direct.arbeidskosten);
    expect(range.materiaalkosten).toBe(direct.materiaalkosten);
    expect(typeof range.totaal).toBe("number");
  });

  it("herleidt een bandbreedte-materiaal tot het gemiddelde van min/max", () => {
    const product = maakProduct({
      materiaalCategorieen: [
        {
          id: "categorie-1",
          materialen: [
            {
              id: "materiaal-1",
              prijs: 0,
              prijsType: "BANDBREEDTE",
              prijsMin: 15,
              prijsMax: 25,
              stapgrootte: null,
              productiviteitOverride: null,
            },
          ],
        },
      ],
    });
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // gemiddelde van 15 en 25 = 20 -> 12*20 = 240
    expect(range.materiaalkosten).toBe(240);
    expect(typeof range.materiaalkosten).toBe("number");
  });
});

describe("calculateBreakdownRange — modus PER_PRODUCT", () => {
  const costSettings: CalcCostSettings = { ...baseCostSettings, bandbreedteModus: "PER_PRODUCT" };

  it("rekent een bandbreedte-materiaal als min/max-paar door, vaste onderdelen blijven gelijk", () => {
    const product = maakProduct({
      materiaalCategorieen: [
        {
          id: "categorie-1",
          materialen: [
            {
              id: "materiaal-1",
              prijs: 0,
              prijsType: "BANDBREEDTE",
              prijsMin: 15,
              prijsMax: 25,
              stapgrootte: null,
              productiviteitOverride: null,
            },
          ],
        },
      ],
    });
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings,
    });

    expect(range.modus).toBe("PER_PRODUCT");
    // arbeidskosten/transport/voorrij bevatten geen bandbreedte -> blijven één bedrag
    expect(range.arbeidskosten).toBe(400);
    expect(range.transportkosten).toBe(25);
    expect(range.voorrijkosten).toBe(35);
    // materiaalkosten: min 12*15=180, max 12*25=300
    expect(range.materiaalkosten).toEqual({ min: 180, max: 300 });
    // subtotaal: min 400+180+25+35=640, max 400+300+25+35=760
    expect(range.subtotaal).toEqual({ min: 640, max: 760 });
    if (typeof range.btw !== "number") {
      expect(range.btw.min).toBeCloseTo(640 * 0.21, 6);
      expect(range.btw.max).toBeCloseTo(760 * 0.21, 6);
    } else {
      throw new Error("btw zou een bandbreedte moeten zijn");
    }
    if (typeof range.totaal !== "number") {
      expect(range.totaal.min).toBeCloseTo(774.4, 6);
      expect(range.totaal.max).toBeCloseTo(919.6, 6);
    } else {
      throw new Error("totaal zou een bandbreedte moeten zijn");
    }
  });

  it("toont één bedrag als geen enkele regel een bandbreedte heeft", () => {
    const product = maakProduct();
    const range = calculateBreakdownRange({
      services: [maakDienst()],
      products: [product],
      serviceSelected: { "dienst-1": true },
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings,
    });

    expect(typeof range.totaal).toBe("number");
    expect(typeof range.subtotaal).toBe("number");
    expect(typeof range.arbeidskosten).toBe("number");
    expect(typeof range.materiaalkosten).toBe("number");
  });

  it("combineert een bandbreedte-dienst (uurtarief) met een vast product", () => {
    const dienst = maakDienst({
      bandbreedteType: "BANDBREEDTE",
      geschatteUrenMin: 8,
      geschatteUrenMax: 12,
    });
    const range = calculateBreakdownRange({
      services: [dienst],
      products: [],
      serviceSelected: { "dienst-1": true },
      productQty: {},
      materialSelections: {},
      extraSelections: {},
      costSettings,
    });

    // uurtarief 45 * 8 = 360, 45*12=540
    expect(range.arbeidskosten).toEqual({ min: 360, max: 540 });
  });
});

describe("calculateBreakdownRange — modus TOTAAL", () => {
  it("past symmetrische marge toe op het eindtotaal, regels blijven vast", () => {
    const costSettings: CalcCostSettings = {
      ...baseCostSettings,
      bandbreedteModus: "TOTAAL",
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    };
    const product = maakProduct();
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings,
    });

    expect(range.modus).toBe("TOTAAL");
    expect(range.subtotaal).toBe(700);
    expect(range.arbeidskosten).toBe(400);
    expect(range.materiaalkosten).toBe(240);
    // totaal (vast, ongeacht marge) = 847 -> min=847*0.9=762.3, max=847*1.1=931.7
    expect(range.totaal).toEqual({ min: 762.3, max: 931.7 });
    expect(range.margeOmlaag).toBe(10);
    expect(range.margeOmhoog).toBe(10);
  });

  it("past asymmetrische marge toe", () => {
    const costSettings: CalcCostSettings = {
      ...baseCostSettings,
      bandbreedteModus: "TOTAAL",
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 15,
    };
    const product = maakProduct();
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings,
    });

    // totaal vast = 847 -> min=847*0.9=762.3, max=847*1.15=974.05
    expect(range.totaal).toEqual({ min: 762.3, max: 974.05 });
  });

  it("herleidt een bandbreedte-materiaal tot het gemiddelde, niet tot min/max", () => {
    const costSettings: CalcCostSettings = { ...baseCostSettings, bandbreedteModus: "TOTAAL" };
    const product = maakProduct({
      materiaalCategorieen: [
        {
          id: "categorie-1",
          materialen: [
            {
              id: "materiaal-1",
              prijs: 0,
              prijsType: "BANDBREEDTE",
              prijsMin: 15,
              prijsMax: 25,
              stapgrootte: null,
              productiviteitOverride: null,
            },
          ],
        },
      ],
    });
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings,
    });

    // gemiddelde 20 * 12 = 240 (niet 180 of 300)
    expect(range.materiaalkosten).toBe(240);
  });

  it("geeft geen marge-bandbreedte als er niets geselecteerd is", () => {
    const costSettings: CalcCostSettings = { ...baseCostSettings, bandbreedteModus: "TOTAAL" };
    const range = calculateBreakdownRange({
      services: [],
      products: [maakProduct()],
      serviceSelected: {},
      productQty: {},
      materialSelections: {},
      extraSelections: {},
      costSettings,
    });

    expect(range.heeftSelectie).toBe(false);
    expect(range.totaal).toBe(0);
  });
});

describe("wederzijdse uitsluiting van de drie modi", () => {
  const product = maakProduct({
    materiaalCategorieen: [
      {
        id: "categorie-1",
        materialen: [
          {
            id: "materiaal-1",
            prijs: 0,
            prijsType: "BANDBREEDTE",
            prijsMin: 15,
            prijsMax: 25,
            stapgrootte: null,
            productiviteitOverride: null,
          },
        ],
      },
    ],
  });
  const args = {
    services: [],
    products: [product],
    serviceSelected: {},
    productQty: { "product-1": 12 },
    materialSelections: { "categorie-1": "materiaal-1" },
    extraSelections: {},
  };

  it("GEEN toont nooit een marge en nooit een per-product-range tegelijk", () => {
    const range = calculateBreakdownRange({ ...args, costSettings: baseCostSettings });
    expect(range.margeOmlaag).toBeUndefined();
    expect(range.margeOmhoog).toBeUndefined();
    expect(typeof range.totaal).toBe("number");
  });

  it("PER_PRODUCT toont nooit een marge-veld", () => {
    const range = calculateBreakdownRange({
      ...args,
      costSettings: { ...baseCostSettings, bandbreedteModus: "PER_PRODUCT" },
    });
    expect(range.margeOmlaag).toBeUndefined();
    expect(range.margeOmhoog).toBeUndefined();
  });

  it("TOTAAL negeert de per-product min/max van bandbreedte-materialen volledig", () => {
    const range = calculateBreakdownRange({
      ...args,
      costSettings: { ...baseCostSettings, bandbreedteModus: "TOTAAL" },
    });
    // materiaalkosten moet het gemiddelde zijn (240), niet 180 of 300
    expect(range.materiaalkosten).toBe(240);
  });
});

describe("bedragTop", () => {
  it("geeft het getal terug als het al een enkel bedrag is", () => {
    expect(bedragTop(100)).toBe(100);
  });
  it("geeft de bovengrens terug van een bandbreedte", () => {
    expect(bedragTop({ min: 10, max: 20 })).toBe(20);
  });
});

describe("serviceVastePrijs", () => {
  it("geeft vastePrijs terug voor een VASTE_PRIJS-dienst zonder bandbreedte", () => {
    const dienst = maakDienst({ prijsType: "VASTE_PRIJS", vastePrijs: 250 });
    expect(serviceVastePrijs(dienst)).toBe(250);
  });
  it("geeft het gemiddelde terug voor een bandbreedte VASTE_PRIJS-dienst", () => {
    const dienst = maakDienst({
      prijsType: "VASTE_PRIJS",
      bandbreedteType: "BANDBREEDTE",
      vastePrijsMin: 200,
      vastePrijsMax: 300,
    });
    expect(serviceVastePrijs(dienst)).toBe(250);
  });
  it("geeft uurtarief × geschatteUren terug voor een UURTARIEF-dienst", () => {
    const dienst = maakDienst({ uurtarief: 45, geschatteUren: 4 });
    expect(serviceVastePrijs(dienst)).toBe(180);
  });
});

describe("arbeidTariefVoorStapEenheid", () => {
  const settings = { arbeidTariefUur: 50, arbeidTariefDagdeel: 200, arbeidTariefDag: 380 };

  it("geeft het juiste tarief terug voor elke tijdseenheid", () => {
    expect(arbeidTariefVoorStapEenheid(settings, "UUR")).toBe(50);
    expect(arbeidTariefVoorStapEenheid(settings, "DAGDEEL")).toBe(200);
    expect(arbeidTariefVoorStapEenheid(settings, "DAG")).toBe(380);
  });
});

describe("geselecteerdeMateriaalOptieId", () => {
  it("selecteert automatisch de enige optie van een categorie", () => {
    const categorie = { id: "cat-1", materialen: [{ id: "opt-1" } as never] };
    expect(geselecteerdeMateriaalOptieId(categorie, {})).toBe("opt-1");
  });

  it("vereist een expliciete keuze zodra er meerdere opties zijn", () => {
    const categorie = { id: "cat-1", materialen: [{ id: "a" } as never, { id: "b" } as never] };
    expect(geselecteerdeMateriaalOptieId(categorie, {})).toBeNull();
    expect(geselecteerdeMateriaalOptieId(categorie, { "cat-1": "b" })).toBe("b");
  });

  it("geeft null terug voor een lege categorie", () => {
    const categorie = { id: "cat-1", materialen: [] };
    expect(geselecteerdeMateriaalOptieId(categorie, {})).toBeNull();
  });
});

describe("berekenProductKosten", () => {
  const basisArgs = {
    materiaalkosten: 280,
    materiaalEnabled: true,
    hoeveelheid: 10,
    productiviteit: 10 as number | null,
    arbeidTarief: 240,
    arbeidEnabled: true,
    arbeidAfronden: false,
    transportBedrag: 45,
    transportMeeschalend: false,
    transportEnabled: true,
    voorrijBedrag: 35,
    voorrijMeeschalend: false,
    voorrijEnabled: true,
  };

  it("berekent het voorbeeld uit de opdracht: 10 m schutting in douglas", () => {
    // Materiaal 10 × €28 = €280, Arbeid 1 dagdeel × €240 = €240,
    // Transport €45, Voorrijkosten €35 -> totaal €600
    const kosten = berekenProductKosten(basisArgs);
    expect(kosten.materiaal).toBe(280);
    expect(kosten.arbeid).toBe(240);
    expect(kosten.transport).toBe(45);
    expect(kosten.voorrijkosten).toBe(35);
    expect(kosten.totaal).toBe(600);
  });

  it("laat materiaalprijs en arbeidstarief volledig los van elkaar staan", () => {
    // Een duurder materiaal verhoogt het arbeidsbedrag niet.
    const goedkoop = berekenProductKosten({ ...basisArgs, materiaalkosten: 100 });
    const duur = berekenProductKosten({ ...basisArgs, materiaalkosten: 900 });
    expect(goedkoop.arbeid).toBe(duur.arbeid);
  });

  it("telt niets mee voor een uitgeschakeld blok", () => {
    const kosten = berekenProductKosten({
      ...basisArgs,
      materiaalEnabled: false,
      arbeidEnabled: false,
      transportEnabled: false,
      voorrijEnabled: false,
    });
    expect(kosten).toEqual({ materiaal: 0, arbeid: 0, transport: 0, voorrijkosten: 0, totaal: 0 });
  });

  it("rekent zonder arbeidstijd (geen productiviteit) geen arbeidskosten", () => {
    const kosten = berekenProductKosten({ ...basisArgs, productiviteit: null });
    expect(kosten.arbeid).toBe(0);
  });

  it("schaalt transport/voorrij mee met de hoeveelheid als dat aanstaat", () => {
    const kosten = berekenProductKosten({
      ...basisArgs,
      transportBedrag: 2,
      transportMeeschalend: true,
      voorrijBedrag: 1,
      voorrijMeeschalend: true,
    });
    expect(kosten.transport).toBe(20); // 10 * 2
    expect(kosten.voorrijkosten).toBe(10); // 10 * 1
  });

  it("rondt arbeidstijd af op hele stappen als arbeidAfronden aanstaat", () => {
    const kosten = berekenProductKosten({
      ...basisArgs,
      hoeveelheid: 12,
      productiviteit: 10,
      arbeidAfronden: true,
    });
    // 12/10 = 1.2 -> ceil naar 2 * 240 = 480
    expect(kosten.arbeid).toBe(480);
  });
});

describe("migratie: gelijkblijvende uitkomst voor bestaande producten", () => {
  // Een product zoals het vóór deze opdracht bestond: een handmatig
  // ingevulde prijsPerEenheid (hier 48) en verder geen materiaalcategorieën,
  // gewone arbeidsCapaciteit/transportkosten, geen eigen voorrijbedrag. De
  // migratie zet die 48 om in de prijs van een nieuw aangemaakte
  // materiaalcategorie/-optie (zie migration.sql) — dit bewijst dat de
  // resulterende totaalprijs identiek blijft aan de oude formule
  // (qty × prijsPerEenheid, zonder marge want die stond hier standaard op 0%).
  const gemigreerdProduct = maakProduct({
    productiviteit: 10,
    transportkostenOverride: 25,
    voorrijkostenOverride: null,
    materiaalCategorieen: [
      {
        id: "materiaal-cat",
        materialen: [
          {
            id: "standaard-optie",
            prijs: 48, // was Product.prijsPerEenheid vóór de migratie
            prijsType: "VAST",
            prijsMin: null,
            prijsMax: null,
            stapgrootte: null,
            productiviteitOverride: null,
          },
        ],
      },
    ],
  });

  it("berekent hetzelfde totaal als de oude prijsPerEenheid-formule, voor een reeks hoeveelheden", () => {
    for (const qty of [1, 2.5, 12, 20, 100]) {
      const result = calculateBreakdown({
        services: [],
        products: [gemigreerdProduct],
        serviceSelected: {},
        productQty: { "product-1": qty },
        materialSelections: {}, // geen keuze nodig — categorie heeft precies 1 optie
        extraSelections: {},
        costSettings: baseCostSettings,
      });

      // Oude formule: materiaalkosten = qty * prijsPerEenheid (48), geen marge.
      expect(result.materiaalkosten).toBeCloseTo(qty * 48, 6);
    }
  });

  it("laat arbeids- en transportkosten van vóór de migratie ongewijzigd (niet op 0 gezet)", () => {
    const result = calculateBreakdown({
      services: [],
      products: [gemigreerdProduct],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // productiviteit 10, 12/10 -> ceil naar 2 dagdelen * 200 = 400 (ongewijzigd
    // t.o.v. vóór de migratie — arbeidsCapaciteit/arbeidTarief zijn nooit
    // aangeraakt door de migratie).
    expect(result.arbeidskosten).toBe(400);
    // transportkostenOverride is de 1-op-1 overgenomen oude Product.transportkosten.
    expect(result.transportkosten).toBe(25);
  });
});
