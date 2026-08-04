import { describe, expect, it } from "vitest";
import {
  bedragTop,
  berekenGestaffeldBedrag,
  calculateBreakdown,
  calculateBreakdownRange,
  serviceVastePrijs,
  type CalcCostSettings,
  type CalcProduct,
  type CalcProductStaffel,
  type CalcService,
} from "./calculate";

const baseCostSettings: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTarief: 200,
  arbeidTariefPerProduct: false,
  transportEnabled: true,
  voorrijEnabled: true,
  voorrijTarief: 35,
  materiaalEnabled: true,
  materiaalMarge: 0,
  materiaalMargePerProduct: false,
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
    arbeidsCapaciteit: 10,
    arbeidTariefOverride: null,
    materiaalMargeOverride: null,
    transportkosten: 25,
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
          },
        ],
      },
    ],
    extraOpties: [],
    prijsPerEenheid: null,
    prijsPerEenheidType: "VAST",
    prijsPerEenheidMin: null,
    prijsPerEenheidMax: null,
    minimumprijs: null,
    staffels: [],
    ...overrides,
  };
}

describe("calculateBreakdown (modus GEEN, bestaand rekenpad)", () => {
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
    // materiaalkosten = 12 * 20 = 240 (geen stapgrootte)
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

describe("berekenGestaffeldBedrag", () => {
  const staffels: CalcProductStaffel[] = [
    { vanaf: 10, prijsPerEenheid: 45 },
    { vanaf: 50, prijsPerEenheid: 40 },
  ];

  it("gebruikt alleen de basisprijs als de hoeveelheid onder de eerste staffel blijft", () => {
    expect(berekenGestaffeldBedrag(8, 50, staffels)).toBe(400); // 8 * 50
  });

  it("rekent cumulatief door de schijven heen, zoals belastingschijven", () => {
    // 0-10 (10) * 50 = 500, 10-50 (40) * 45 = 1800, 50-70 (20) * 40 = 800
    expect(berekenGestaffeldBedrag(70, 50, staffels)).toBe(3100);
  });

  it("werkt met staffels die niet al gesorteerd zijn aangeleverd", () => {
    const ongesorteerd: CalcProductStaffel[] = [
      { vanaf: 50, prijsPerEenheid: 40 },
      { vanaf: 10, prijsPerEenheid: 45 },
    ];
    expect(berekenGestaffeldBedrag(70, 50, ongesorteerd)).toBe(3100);
  });

  it("geeft 0 terug voor een hoeveelheid van 0 of minder", () => {
    expect(berekenGestaffeldBedrag(0, 50, staffels)).toBe(0);
    expect(berekenGestaffeldBedrag(-5, 50, staffels)).toBe(0);
  });

  it("werkt zonder staffels als platte hoeveelheid × basisprijs", () => {
    expect(berekenGestaffeldBedrag(12, 50, [])).toBe(600);
  });
});

describe("calculateBreakdown — prijsPerEenheid (sjablonen fase 1)", () => {
  it("telt hoeveelheid × prijsPerEenheid op bij materiaalkosten, naast materiaalCategorieen", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 48,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 20 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.arbeidskosten).toBe(0);
    expect(result.materiaalkosten).toBe(960); // 20 * 48
  });

  it("past materiaalMarge ook toe op de prijsPerEenheid-bijdrage", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 48,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 20 },
      materialSelections: {},
      extraSelections: {},
      costSettings: { ...baseCostSettings, materiaalMarge: 10 },
    });

    expect(result.materiaalkosten).toBeCloseTo(960 * 1.1, 6);
  });

  it("gebruikt de gestaffelde prijs zodra het product staffels heeft", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 50,
      staffels: [
        { vanaf: 10, prijsPerEenheid: 45 },
        { vanaf: 50, prijsPerEenheid: 40 },
      ],
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 70 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(3100);
  });

  it("licht de prijsPerEenheid-bijdrage op tot minimumprijs, indien lager", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 48,
      minimumprijs: 500,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 2 }, // 2 * 48 = 96, onder de minimumprijs
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(500);
  });

  it("raakt minimumprijs niet aan als de berekende prijs er al boven zit", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 48,
      minimumprijs: 100,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 20 }, // 20 * 48 = 960
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(960);
  });

  it("bestaande producten (prijsPerEenheid null) blijven ongewijzigd — geen extra bijdrage", () => {
    const product = maakProduct(); // prijsPerEenheid: null via de default
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 12 },
      materialSelections: { "categorie-1": "materiaal-1" },
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    // Zelfde uitkomst als de allereerste test in dit bestand.
    expect(result.materiaalkosten).toBe(240);
  });
});

describe("calculateBreakdown — productRegelsBedrag (sjabloon ARTIKELREGELS)", () => {
  it("telt het al-berekende regelsbedrag op bij materiaalkosten, los van prijsPerEenheid", () => {
    const product = maakProduct({ arbeidsCapaciteit: null, materiaalCategorieen: [] });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: {},
      productRegelsBedrag: { "product-1": 700 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(700);
    expect(result.heeftSelectie).toBe(true);
  });

  it("gebruikt productQty voor arbeidskosten, onafhankelijk van het regelsbedrag", () => {
    const product = maakProduct({ materiaalCategorieen: [] });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 20 }, // arbeidsCapaciteit: 10 -> 2 dagdelen -> 400
      productRegelsBedrag: { "product-1": 700 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.arbeidskosten).toBe(400);
    expect(result.materiaalkosten).toBe(700);
  });

  it("licht het regelsbedrag op tot minimumprijs, indien lager", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      minimumprijs: 500,
    });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: {},
      productRegelsBedrag: { "product-1": 120 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(500);
  });

  it("telt niet mee zonder qty én zonder regelsbedrag", () => {
    const product = maakProduct({ arbeidsCapaciteit: null, materiaalCategorieen: [] });
    const result = calculateBreakdown({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: {},
      productRegelsBedrag: {},
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(result.materiaalkosten).toBe(0);
    expect(result.heeftSelectie).toBe(false);
  });

  it("blijft ongewijzigd voor bestaande aanroepen zonder productRegelsBedrag-argument", () => {
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

    expect(result.materiaalkosten).toBe(240);
  });
});

describe("calculateBreakdownRange — bandbreedte op prijsPerEenheid", () => {
  it("rekent een BANDBREEDTE-prijsPerEenheid door als min/max-paar (modus PER_PRODUCT)", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 0,
      prijsPerEenheidType: "BANDBREEDTE",
      prijsPerEenheidMin: 40,
      prijsPerEenheidMax: 60,
    });
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 10 },
      materialSelections: {},
      extraSelections: {},
      costSettings: { ...baseCostSettings, bandbreedteModus: "PER_PRODUCT" },
    });

    expect(range.materiaalkosten).toEqual({ min: 400, max: 600 });
  });

  it("herleidt een BANDBREEDTE-prijsPerEenheid tot het gemiddelde (modus GEEN)", () => {
    const product = maakProduct({
      arbeidsCapaciteit: null,
      materiaalCategorieen: [],
      prijsPerEenheid: 0,
      prijsPerEenheidType: "BANDBREEDTE",
      prijsPerEenheidMin: 40,
      prijsPerEenheidMax: 60,
    });
    const range = calculateBreakdownRange({
      services: [],
      products: [product],
      serviceSelected: {},
      productQty: { "product-1": 10 },
      materialSelections: {},
      extraSelections: {},
      costSettings: baseCostSettings,
    });

    expect(range.materiaalkosten).toBe(500); // 10 * ((40+60)/2)
  });
});
