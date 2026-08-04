import { describe, expect, it } from "vitest";
import {
  SJABLOON_REGISTRY,
  SJABLOON_OPTIES,
  hoeveelheidUitResultaat,
  type AfmetingenConfig,
  type AfmetingenInvoer,
  type ArtikelregelsConfig,
  type ArtikelregelsInvoer,
  type RuimtesConfig,
  type RuimtesInvoer,
} from "./sjablonen";

describe("SJABLOON_REGISTRY", () => {
  it("bevat alle vier sjablonen met consistente vorm", () => {
    expect(Object.keys(SJABLOON_REGISTRY).sort()).toEqual(
      ["AFMETINGEN", "ARTIKELREGELS", "ENKELE_HOEVEELHEID", "RUIMTES"].sort()
    );
    expect(SJABLOON_OPTIES).toHaveLength(4);
    for (const optie of SJABLOON_OPTIES) {
      expect(optie.label.length).toBeGreaterThan(0);
      expect(optie.voorbeeldenTekst.length).toBeGreaterThan(0);
    }
  });
});

describe("hoeveelheidUitResultaat", () => {
  it("geeft de waarde terug voor een hoeveelheid-resultaat", () => {
    expect(hoeveelheidUitResultaat({ soort: "hoeveelheid", waarde: 42 })).toBe(42);
  });

  it("telt de aantallen van alle regels op voor een regels-resultaat", () => {
    expect(
      hoeveelheidUitResultaat({
        soort: "regels",
        regels: [
          { omschrijving: "A", aantal: 2, prijsPerEenheid: 10 },
          { omschrijving: "B", aantal: 3, prijsPerEenheid: 20 },
        ],
      })
    ).toBe(5);
  });
});

describe("ENKELE_HOEVEELHEID", () => {
  const sjabloon = SJABLOON_REGISTRY.ENKELE_HOEVEELHEID;

  it("geeft de ingevoerde hoeveelheid rechtstreeks terug", () => {
    const resultaat = sjabloon.berekenHoeveelheid({}, { hoeveelheid: 12 });
    expect(resultaat).toEqual({ soort: "hoeveelheid", waarde: 12 });
  });

  it("klapt negatieve invoer om naar 0", () => {
    const resultaat = sjabloon.berekenHoeveelheid({}, { hoeveelheid: -5 });
    expect(resultaat).toEqual({ soort: "hoeveelheid", waarde: 0 });
  });

  it("heeft geen instel- of klantvelden nodig", () => {
    expect(sjabloon.instelVelden).toEqual([]);
    expect(sjabloon.klantVelden({})).toEqual([]);
  });
});

describe("AFMETINGEN", () => {
  const sjabloon = SJABLOON_REGISTRY.AFMETINGEN;

  it("rekent lengte × breedte uit tot m² zonder diepte", () => {
    const config: AfmetingenConfig = { metDiepte: false };
    const invoer: AfmetingenInvoer = { lengte: 12, breedte: 4, diepte: 0 };
    expect(sjabloon.berekenHoeveelheid(config, invoer)).toEqual({ soort: "hoeveelheid", waarde: 48 });
    expect(sjabloon.vasteEenheid(config)).toBe("m2");
  });

  it("rekent lengte × breedte × diepte uit tot m³ mét diepte", () => {
    const config: AfmetingenConfig = { metDiepte: true };
    const invoer: AfmetingenInvoer = { lengte: 12, breedte: 4, diepte: 0.3 };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect(resultaat.soort).toBe("hoeveelheid");
    expect((resultaat as { waarde: number }).waarde).toBeCloseTo(14.4, 6);
    expect(sjabloon.vasteEenheid(config)).toBe("m3");
  });

  it("toont het diepteveld alleen als metDiepte aanstaat", () => {
    expect(sjabloon.klantVelden({ metDiepte: false }).map((v) => v.key)).toEqual(["lengte", "breedte"]);
    expect(sjabloon.klantVelden({ metDiepte: true }).map((v) => v.key)).toEqual([
      "lengte",
      "breedte",
      "diepte",
    ]);
  });

  it("negeert negatieve afmetingen (klapt om naar 0)", () => {
    const resultaat = sjabloon.berekenHoeveelheid({ metDiepte: false }, { lengte: -5, breedte: 4, diepte: 0 });
    expect(resultaat).toEqual({ soort: "hoeveelheid", waarde: 0 });
  });
});

describe("RUIMTES", () => {
  const sjabloon = SJABLOON_REGISTRY.RUIMTES;

  it("telt alleen wandoppervlak mee met de standaardconfig, aftrek inbegrepen", () => {
    const config: RuimtesConfig = {
      telVloerMee: false,
      telPlafondMee: false,
      telWandMee: true,
      standaardAftrek: 2.5,
    };
    // omtrek = 2*(5+4) = 18, wand = 18*2.6 = 46.8, min 2.5 aftrek = 44.3
    const invoer: RuimtesInvoer = { ruimtes: [{ naam: "Woonkamer", lengte: 5, breedte: 4, hoogte: 2.6, aftrek: 2.5 }] };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect(resultaat.soort).toBe("hoeveelheid");
    expect((resultaat as { waarde: number }).waarde).toBeCloseTo(44.3, 6);
  });

  it("telt vloer + plafond + wand van meerdere ruimtes samen als alle drie aanstaan", () => {
    const config: RuimtesConfig = {
      telVloerMee: true,
      telPlafondMee: true,
      telWandMee: true,
      standaardAftrek: 0,
    };
    const invoer: RuimtesInvoer = {
      ruimtes: [
        { naam: "Woonkamer", lengte: 5, breedte: 4, hoogte: 2.5, aftrek: 0 },
        { naam: "Slaapkamer", lengte: 3, breedte: 3, hoogte: 2.5, aftrek: 0 },
      ],
    };
    // Woonkamer: vloer 20 + plafond 20 + wand 2*(9)*2.5=45 = 85
    // Slaapkamer: vloer 9 + plafond 9 + wand 2*(6)*2.5=30 = 48
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect((resultaat as { waarde: number }).waarde).toBeCloseTo(133, 6);
  });

  it("laat wandoppervlak nooit negatief worden door een te grote aftrek", () => {
    const config: RuimtesConfig = { telVloerMee: false, telPlafondMee: false, telWandMee: true, standaardAftrek: 0 };
    const invoer: RuimtesInvoer = { ruimtes: [{ naam: "Wc", lengte: 1, breedte: 1, hoogte: 2, aftrek: 999 }] };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect((resultaat as { waarde: number }).waarde).toBe(0);
  });

  it("geeft 0 terug zonder ruimtes", () => {
    const config: RuimtesConfig = { telVloerMee: true, telPlafondMee: false, telWandMee: false, standaardAftrek: 0 };
    expect(sjabloon.berekenHoeveelheid(config, { ruimtes: [] })).toEqual({ soort: "hoeveelheid", waarde: 0 });
  });
});

describe("ARTIKELREGELS", () => {
  const sjabloon = SJABLOON_REGISTRY.ARTIKELREGELS;
  const config: ArtikelregelsConfig = {
    artikelTypes: [
      { id: "draaikiep", naam: "Draaikiepraam", prijsPerEenheid: 350, berekening: "m2" },
      { id: "kastje", naam: "Keukenkastje", prijsPerEenheid: 120, berekening: "stuk" },
    ],
  };

  it("berekent m²-artikelen als breedte × hoogte × aantal, met eigen prijs per type", () => {
    const invoer: ArtikelregelsInvoer = {
      regels: [{ artikelTypeId: "draaikiep", breedte: 1.2, hoogte: 1.5, aantal: 2 }],
    };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect(resultaat.soort).toBe("regels");
    const regels = (resultaat as { regels: { omschrijving: string; aantal: number; prijsPerEenheid: number }[] })
      .regels;
    expect(regels).toHaveLength(1);
    expect(regels[0].omschrijving).toBe("Draaikiepraam");
    expect(regels[0].prijsPerEenheid).toBe(350);
    expect(regels[0].aantal).toBeCloseTo(3.6, 6); // 1.2 * 1.5 * 2
  });

  it("berekent stuk-artikelen als alleen aantal, met eigen prijs per type", () => {
    const invoer: ArtikelregelsInvoer = { regels: [{ artikelTypeId: "kastje", breedte: 0, hoogte: 0, aantal: 4 }] };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect(resultaat).toEqual({
      soort: "regels",
      regels: [{ omschrijving: "Keukenkastje", aantal: 4, prijsPerEenheid: 120 }],
    });
  });

  it("houdt verschillende artikeltypes als losse regels uit elkaar (elk met eigen prijs)", () => {
    const invoer: ArtikelregelsInvoer = {
      regels: [
        { artikelTypeId: "draaikiep", breedte: 1, hoogte: 1, aantal: 1 },
        { artikelTypeId: "kastje", breedte: 0, hoogte: 0, aantal: 3 },
      ],
    };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect(resultaat.soort).toBe("regels");
    const regels = (resultaat as { regels: { omschrijving: string; prijsPerEenheid: number }[] }).regels;
    expect(regels).toHaveLength(2);
    expect(regels[0]).toMatchObject({ omschrijving: "Draaikiepraam", prijsPerEenheid: 350 });
    expect(regels[1]).toMatchObject({ omschrijving: "Keukenkastje", prijsPerEenheid: 120 });
  });

  it("slaat regels met een onbekend artikeltype of aantal 0 over", () => {
    const invoer: ArtikelregelsInvoer = {
      regels: [
        { artikelTypeId: "onbekend", breedte: 1, hoogte: 1, aantal: 1 },
        { artikelTypeId: "kastje", breedte: 0, hoogte: 0, aantal: 0 },
      ],
    };
    const resultaat = sjabloon.berekenHoeveelheid(config, invoer);
    expect(resultaat).toEqual({ soort: "regels", regels: [] });
  });

  it("toont breedte/hoogte alleen voor een m²-artikeltype (zichtbaarAls)", () => {
    const veld = sjabloon.klantVelden(config).find((v) => v.key === "regels");
    if (veld?.soort !== "regelgroep" || !veld.zichtbaarAls) throw new Error("regelgroep-veld verwacht");
    expect(veld.zichtbaarAls("breedte", { artikelTypeId: "draaikiep" })).toBe(true);
    expect(veld.zichtbaarAls("breedte", { artikelTypeId: "kastje" })).toBe(false);
    expect(veld.zichtbaarAls("aantal", { artikelTypeId: "kastje" })).toBe(true);
  });
});
