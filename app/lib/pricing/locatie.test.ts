import { describe, expect, it } from "vitest";
import { berekenPrijs } from "./engine";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { aanvullingTotMinimum } from "./locatie";
import { regelTotaal } from "./totalen";
import { BASIS_KOSTEN, optie, product, type TestProduct } from "./test-helpers";
import { werkgebiedInstellingenSchema, type WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import type { CalcCostSettings } from "@/app/lib/calculate";

// Werkgebied en minimale opdracht in de rekenkern: alle combinaties van gedrag, de randen, postcodereeksen en een storing.

const START = { postcode: "8011AB", huisnummer: "1", toevoeging: "", straat: "S", plaats: "Zwolle", lat: 52.5, lon: 6.1 };
const instellingen = (w: object = {}, m: object = {}): WerkgebiedInstellingen => werkgebiedInstellingenSchema.parse({ werkgebied: { start: START, ...w }, minimum: m });

// 20 m² à € 20 = 400, arbeid 2 dagdelen × 200 = 400, voorrijkosten 35 → 835 excl.; btw 21% → 1.010,35 incl.
const klus = (): TestProduct => product({ id: "a", productiviteit: 10 });
const KLUS_INCL = 101035;

function reken(i: WerkgebiedInstellingen | null, locatie?: { postcode?: string | null; afstandKm?: number | null }, kosten: Partial<CalcCostSettings> = {}, qty = 20, kor = false) {
  const p = klus();
  const config = configVanProducten([p], { ...BASIS_KOSTEN, ...kosten }, { werkgebied: i, kor });
  const invoer = invoerVanKlant({ producten: [p], hoeveelheden: { a: qty }, ...(locatie ? { locatie: { postcode: locatie.postcode ?? null, huisnummer: "1", toevoeging: "", afstandKm: locatie.afstandKm ?? null } } : {}) });
  return berekenPrijs(config, invoer);
}

const somKloppend = (r: ReturnType<typeof reken>) => {
  expect(r.regels.reduce((s, x) => s + x.bedragExclCenten, 0)).toBe(r.subtotaalExclCenten);
  expect(r.regels.reduce((s, x) => s + x.bedragInclCenten, 0)).toBe(r.totaalInclCenten);
  expect(r.subtotaalExclCenten + r.btwCenten).toBe(r.totaalInclCenten);
};

describe("alles uit: precies zoals zonder werkgebied en minimum", () => {
  it("geeft hetzelfde resultaat met of zonder (lege) instellingen", () => {
    const zonder = reken(null);
    const uit = reken(instellingen());
    expect(uit.regels).toEqual(zonder.regels);
    expect(uit.totaalInclCenten).toBe(KLUS_INCL);
    expect(uit.requestAllowed).toBe(true);
    expect(uit.flags).toEqual([]);
    expect(uit.serviceArea.enabled).toBe(false);
    expect(uit.minimum.enabled).toBe(false);
  });
  it("een adres of afstand telt niet mee als het werkgebied uit staat", () => {
    expect(reken(instellingen(), { afstandKm: 500 }).totaalInclCenten).toBe(KLUS_INCL);
  });
});

describe("werkgebied: straal", () => {
  const straal = (buiten: string, extra: object = {}) => instellingen({ aan: true, methode: "STRAAL", straalKm: 30, buiten, ...extra });

  it("binnen de straal: toegestaan, geen markering, geen toeslag, afstand vermeld", () => {
    const r = reken(straal("GEEN_AANVRAAG"), { afstandKm: 12.34 });
    expect(r.serviceArea).toMatchObject({ enabled: true, withinServiceArea: true, distanceKm: 12.3, allowed: true, surchargeCenten: 0, reason: null });
    expect(r.requestAllowed).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it("precies op de straalgrens valt nog binnen; een tiende kilometer verder is buiten", () => {
    expect(reken(straal("GEEN_AANVRAAG"), { afstandKm: 30 }).serviceArea.withinServiceArea).toBe(true);
    expect(reken(straal("GEEN_AANVRAAG"), { afstandKm: 30.04 }).serviceArea.withinServiceArea).toBe(true); // afgerond 30,0
    const buiten = reken(straal("GEEN_AANVRAAG"), { afstandKm: 30.05 });
    expect(buiten.serviceArea).toMatchObject({ withinServiceArea: false, distanceKm: 30.1 });
  });

  it("gedrag a, buiten: de prijs wordt wel berekend, de aanvraag niet toegestaan", () => {
    const r = reken(straal("GEEN_AANVRAAG"), { afstandKm: 45 });
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
    expect(r.serviceArea).toMatchObject({ withinServiceArea: false, allowed: false, reason: "outside" });
    expect(r.requestAllowed).toBe(false);
    expect(r.flags).toEqual([]);
  });

  it("gedrag b, buiten: toegestaan en gemarkeerd als buiten werkgebied", () => {
    const r = reken(straal("MARKEREN"), { afstandKm: 45 });
    expect(r.serviceArea).toMatchObject({ withinServiceArea: false, allowed: true });
    expect(r.requestAllowed).toBe(true);
    expect(r.flags).toEqual(["BUITEN_WERKGEBIED"]);
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
  });

  it("gedrag c per kilometer: een eigen projectregel voor de extra afstand, het totaal blijft de som van de regels", () => {
    const r = reken(straal("TOESLAG", { toeslag: { modus: "PER_KM", perKmEuro: 1.5, zones: [] } }), { afstandKm: 34.4 });
    const regel = r.projectRegels.find((x) => x.soort === "afstand")!;
    // 34,4 km, straal 30: 4,4 km extra × € 1,50 = € 6,60
    expect(regel).toMatchObject({ omschrijving: "Voorrijkosten extra afstand (34,4 km)", aantal: 4.4, eenheid: "km", prijsPerEenheidCenten: 150, bedragExclCenten: 660, onderdeelId: null });
    expect(r.serviceArea).toMatchObject({ withinServiceArea: false, allowed: true, surchargeCenten: 660 });
    expect(r.kosten.afstand).toBe(660);
    expect(r.subtotaalExclCenten).toBe(83500 + 660);
    somKloppend(r);
    expect(r.flags).toEqual([]);
  });

  it("gedrag c per kilometer: precies op de straal geen toeslag", () => {
    const r = reken(straal("TOESLAG", { toeslag: { modus: "PER_KM", perKmEuro: 1.5, zones: [] } }), { afstandKm: 30 });
    expect(r.projectRegels.find((x) => x.soort === "afstand")).toBeUndefined();
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
  });

  describe("gedrag c met zones (0–20 km € 0, 20–40 km € 35, 40+ niet mogelijk)", () => {
    const zones = { toeslag: { modus: "ZONES", perKmEuro: 0, zones: [{ totKm: 20, bedragEuro: 0 }, { totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }] } };
    const i = straal("TOESLAG", { straalKm: 20, ...zones });
    it("zone 1: geen toeslag", () => {
      const r = reken(i, { afstandKm: 15 });
      expect(r.projectRegels.find((x) => x.soort === "afstand")).toBeUndefined();
      expect(r.requestAllowed).toBe(true);
    });
    it("zone 2: vaste toeslag, ook precies op de grens van 40 km", () => {
      for (const km of [20.1, 33, 40]) {
        const r = reken(i, { afstandKm: km });
        expect(r.projectRegels.find((x) => x.soort === "afstand")).toMatchObject({ bedragExclCenten: 3500, eenheid: "post" });
        expect(r.requestAllowed).toBe(true);
        somKloppend(r);
      }
      expect(reken(i, { afstandKm: 33 }).projectRegels.find((x) => x.soort === "afstand")!.omschrijving).toBe("Voorrijkosten extra afstand (33 km)");
    });
    it("zone 3: niet mogelijk", () => {
      const r = reken(i, { afstandKm: 40.1 });
      expect(r.serviceArea).toMatchObject({ allowed: false, reason: "zone-not-possible" });
      expect(r.requestAllowed).toBe(false);
      expect(r.projectRegels.find((x) => x.soort === "afstand")).toBeUndefined();
    });
  });

  it("de toeslag telt mee in btw en totaal (21% en 9%)", () => {
    for (const pct of [21, 9]) {
      const r = reken(straal("TOESLAG", { toeslag: { modus: "PER_KM", perKmEuro: 2, zones: [] } }), { afstandKm: 40 }, { btwPercentage: pct });
      const regel = r.projectRegels.find((x) => x.soort === "afstand")!;
      expect(regel.btwPercentage).toBe(pct);
      expect(regel.bedragInclCenten).toBe(regel.bedragExclCenten + Math.round((regel.bedragExclCenten * pct) / 100));
      somKloppend(r);
    }
  });

  it("zonder bruikbare afstand (PDOK-storing of geen adres): niet gecontroleerd, nooit blokkeren, geen toeslag", () => {
    for (const buiten of ["GEEN_AANVRAAG", "MARKEREN", "TOESLAG"]) {
      const r = reken(straal(buiten), { afstandKm: null });
      expect(r.serviceArea).toMatchObject({ enabled: true, withinServiceArea: "unknown", allowed: true });
      expect(r.requestAllowed).toBe(true);
      expect(r.flags).toEqual(["WERKGEBIED_NIET_GECONTROLEERD"]);
      expect(r.totaalInclCenten).toBe(KLUS_INCL);
    }
    expect(reken(straal("GEEN_AANVRAAG")).flags).toEqual(["WERKGEBIED_NIET_GECONTROLEERD"]);
  });
});

describe("werkgebied: postcodegebieden", () => {
  const pc = (buiten: string) => instellingen({ aan: true, methode: "POSTCODES", postcodes: "8000-8099, 8101, 8200", buiten });
  it("binnen: de randen van een reeks, losse postcodes en met letters achter de cijfers", () => {
    for (const code of ["8000", "8099", "8050", "8101", "8200", "8011 AB", "8099zz"]) {
      expect(reken(pc("GEEN_AANVRAAG"), { postcode: code }).serviceArea.withinServiceArea, code).toBe(true);
    }
  });
  it("buiten: net naast een reeks of een losse postcode", () => {
    for (const code of ["7999", "8100", "8102", "8199", "8201", "1011"]) {
      expect(reken(pc("GEEN_AANVRAAG"), { postcode: code }).serviceArea, code).toMatchObject({ withinServiceArea: false, allowed: false });
    }
  });
  it("gedrag b markeert, gedrag a weigert", () => {
    expect(reken(pc("MARKEREN"), { postcode: "9000" }).flags).toEqual(["BUITEN_WERKGEBIED"]);
    expect(reken(pc("GEEN_AANVRAAG"), { postcode: "9000" }).requestAllowed).toBe(false);
  });
  it("zonder (geldige) postcode: niet gecontroleerd", () => {
    expect(reken(pc("GEEN_AANVRAAG"), { postcode: null }).flags).toEqual(["WERKGEBIED_NIET_GECONTROLEERD"]);
    expect(reken(pc("GEEN_AANVRAAG"), { postcode: "abc" }).serviceArea.withinServiceArea).toBe("unknown");
  });
  it("heeft geen afstand of PDOK nodig", () => {
    expect(reken(pc("GEEN_AANVRAAG"), { postcode: "8011", afstandKm: null }).serviceArea.withinServiceArea).toBe(true);
  });
});

describe("minimale opdracht (incl. btw)", () => {
  const minimum = (bedragEuro: number, gedrag: string) => instellingen({}, { aan: true, bedragEuro, gedrag });

  it("boven het minimum verandert er niets", () => {
    const r = reken(minimum(500, "TARIEF"));
    expect(r.minimum).toMatchObject({ enabled: true, belowMinimum: false, topUpCenten: 0, allowed: true });
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
  });

  it("precies het minimumbedrag is niet eronder", () => {
    for (const gedrag of ["TARIEF", "GEEN_AANVRAAG", "MARKEREN"]) {
      const r = reken(minimum(1010.35, gedrag));
      expect(r.minimum.belowMinimum, gedrag).toBe(false);
      expect(r.requestAllowed, gedrag).toBe(true);
      expect(r.flags, gedrag).toEqual([]);
    }
  });

  it("één cent eronder is wel eronder", () => {
    expect(reken(minimum(1010.36, "MARKEREN")).minimum.belowMinimum).toBe(true);
  });

  it("gedrag a (minimumtarief): een eigen correctieregel, het totaal wordt precies het minimum", () => {
    const r = reken(minimum(1500, "TARIEF"));
    const regel = r.projectRegels.find((x) => x.soort === "minimum")!;
    expect(regel.omschrijving).toBe("Aanvulling tot minimumtarief");
    expect(r.minimum).toMatchObject({ belowMinimum: true, minimumInclCenten: 150000, allowed: true });
    expect(r.totaalInclCenten).toBe(150000);
    expect(r.minimum.topUpCenten).toBe(regel.bedragExclCenten);
    expect(r.requestAllowed).toBe(true);
    expect(r.flags).toEqual([]);
    somKloppend(r);
  });

  it("gedrag a: het minimum wordt ook precies gehaald bij btw 9%, 0% en KOR", () => {
    for (const [pct, kor] of [[9, false], [0, false], [21, true]] as const) {
      const r = reken(minimum(1234.56, "TARIEF"), undefined, { btwPercentage: pct }, 20, kor);
      expect(r.totaalInclCenten, `${pct}% kor=${kor}`).toBe(123456);
      somKloppend(r);
    }
  });

  it("gedrag b (niet mogelijk): de prijs blijft zoals hij is, de aanvraag is niet toegestaan", () => {
    const r = reken(minimum(1500, "GEEN_AANVRAAG"));
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
    expect(r.minimum).toMatchObject({ belowMinimum: true, allowed: false, topUpCenten: 0 });
    expect(r.requestAllowed).toBe(false);
    expect(r.projectRegels.find((x) => x.soort === "minimum")).toBeUndefined();
  });

  it("gedrag c (markeren): toegestaan met de markering onder minimum", () => {
    const r = reken(minimum(1500, "MARKEREN"));
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
    expect(r.minimum).toMatchObject({ belowMinimum: true, allowed: true });
    expect(r.requestAllowed).toBe(true);
    expect(r.flags).toEqual(["ONDER_MINIMUM"]);
  });

  it("zonder selectie is er niets om aan te vullen of te weigeren", () => {
    const r = reken(minimum(1500, "GEEN_AANVRAAG"), undefined, {}, 0);
    expect(r.heeftSelectie).toBe(false);
    expect(r.minimum.belowMinimum).toBe(false);
    expect(r.totaalInclCenten).toBe(0);
  });

  it("aanvullingTotMinimum haalt het tekort voor elk bedrag en tarief", () => {
    for (const pct of [0, 9, 21]) {
      for (let tekort = 1; tekort <= 400; tekort++) {
        const x = aanvullingTotMinimum(tekort, pct);
        const incl = regelTotaal(x, pct).inclCenten;
        expect(incl).toBeGreaterThanOrEqual(tekort);
        expect(incl - tekort).toBeLessThanOrEqual(1);
      }
    }
  });

  it("bij een bandbreedte over het totaal gaat de onderkant niet onder het minimumtarief", () => {
    const r = reken(minimum(1500, "TARIEF"), undefined, { bandbreedteModus: "TOTAAL", bandbreedteMargeOmlaag: 20, bandbreedteMargeOmhoog: 10 });
    expect(r.totaalInclCenten).toBe(150000);
    expect(r.bandbreedte!.min.totaalInclCenten).toBe(150000);
    expect(r.bandbreedte!.max.totaalInclCenten).toBe(165000);
  });
});

describe("werkgebied en minimum samen: alle combinaties", () => {
  const wgGedrag = ["GEEN_AANVRAAG", "MARKEREN", "TOESLAG"] as const;
  const minGedrag = ["TARIEF", "GEEN_AANVRAAG", "MARKEREN"] as const;
  for (const w of wgGedrag) {
    for (const m of minGedrag) {
      it(`buiten (${w}) en onder het minimum (${m})`, () => {
        const i = instellingen({ aan: true, methode: "STRAAL", straalKm: 30, buiten: w, toeslag: { modus: "PER_KM", perKmEuro: 1, zones: [] } }, { aan: true, bedragEuro: 1500, gedrag: m });
        const r = reken(i, { afstandKm: 40 });
        somKloppend(r);
        const toegestaan = !(w === "GEEN_AANVRAAG") && m !== "GEEN_AANVRAAG";
        expect(r.requestAllowed).toBe(toegestaan);
        expect(r.flags).toEqual([...(w === "MARKEREN" ? ["BUITEN_WERKGEBIED"] : []), ...(m === "MARKEREN" ? ["ONDER_MINIMUM"] : [])]);
        // De toeslag telt mee voordat het minimum wordt bekeken: met toeslag én minimumtarief is het totaal precies het minimum.
        if (m === "TARIEF") expect(r.totaalInclCenten).toBe(150000);
        if (w === "TOESLAG") expect(r.kosten.afstand).toBe(1000);
      });
    }
  }
  it("de toeslag kan een klus boven het minimum tillen", () => {
    const i = instellingen({ aan: true, methode: "STRAAL", straalKm: 30, buiten: "TOESLAG", toeslag: { modus: "PER_KM", perKmEuro: 20, zones: [] } }, { aan: true, bedragEuro: 1050, gedrag: "TARIEF" });
    const r = reken(i, { afstandKm: 40 }); // 10 km × € 20 = € 200 → 1.035 excl. → 1.252,35 incl., boven € 1.050
    expect(r.minimum.belowMinimum).toBe(false);
    expect(r.totaalInclCenten).toBe(Math.round((83500 + 20000) * 1.21));
  });
  it("binnen het werkgebied en boven het minimum: niets verandert", () => {
    const i = instellingen({ aan: true, methode: "STRAAL", straalKm: 30, buiten: "GEEN_AANVRAAG" }, { aan: true, bedragEuro: 500, gedrag: "GEEN_AANVRAAG" });
    const r = reken(i, { afstandKm: 10 });
    expect(r.requestAllowed).toBe(true);
    expect(r.totaalInclCenten).toBe(KLUS_INCL);
    expect(r.flags).toEqual([]);
  });
});

import fc from "fast-check";

describe("eigenschappen met werkgebied en minimum", () => {
  const instellingenArb = fc
    .record({
      buiten: fc.constantFrom("GEEN_AANVRAAG", "MARKEREN", "TOESLAG"),
      modus: fc.constantFrom("PER_KM", "ZONES"),
      perKm: fc.double({ min: 0, max: 10, noNaN: true }),
      min: fc.integer({ min: 0, max: 5000 }),
      gedrag: fc.constantFrom("TARIEF", "GEEN_AANVRAAG", "MARKEREN"),
    })
    .map((c) =>
      instellingen(
        { aan: true, methode: "STRAAL", straalKm: 25, buiten: c.buiten, toeslag: { modus: c.modus, perKmEuro: c.perKm, zones: [{ totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }] } },
        { aan: c.min > 0, bedragEuro: c.min, gedrag: c.gedrag }
      )
    );
  const afstand = fc.oneof(fc.constant(null), fc.double({ min: 0, max: 200, noNaN: true }));

  it("het totaal is de som van de regels en nooit lager bij meer hoeveelheid", () => {
    fc.assert(
      fc.property(instellingenArb, afstand, fc.double({ min: 0.1, max: 300, noNaN: true }), fc.double({ min: 0, max: 50, noNaN: true }), (i, km, q, extra) => {
        const a = reken(i, { afstandKm: km }, {}, q);
        const b = reken(i, { afstandKm: km }, {}, q + extra);
        somKloppend(a);
        expect(b.totaalInclCenten).toBeGreaterThanOrEqual(a.totaalInclCenten);
        if (i.minimum.aan && i.minimum.gedrag === "TARIEF") expect(a.totaalInclCenten).toBeGreaterThanOrEqual(Math.round(i.minimum.bedragEuro * 100));
        // dezelfde invoer, dezelfde uitkomst
        expect(JSON.stringify(reken(i, { afstandKm: km }, {}, q))).toBe(JSON.stringify(a));
      }),
      { numRuns: 300 }
    );
  });
});
