import { describe, expect, it } from "vitest";
import { berekenTotalen, prijsPerEenheidWeergave, regelBedragExcl } from "./bereken";
import type { OfferteInhoud, OfferteRegel } from "./model";

const afzender = { korActief: false } as OfferteInhoud["afzender"];
const kor = { korActief: true } as OfferteInhoud["afzender"];
const particulier = { type: "particulier" } as OfferteInhoud["klant"];
const zakelijk = { type: "zakelijk" } as OfferteInhoud["klant"];
let n = 0;
const regel = (o: Partial<OfferteRegel>): OfferteRegel => ({ id: `r${++n}`, type: "normaal", omschrijving: "x", aantal: 1, eenheid: "stuk", prijsCenten: 10000, btw: 21, soort: "overig", ...o });
const inhoud = (regels: OfferteRegel[], klant = particulier, a = afzender) => ({ secties: [{ id: "s", titel: "S", regels }], klant, afzender: a });

describe("berekenTotalen", () => {
  it("gemengde tarieven (21% en 9%), particulier: totaal incl. btw", () => {
    const t = berekenTotalen(inhoud([regel({ aantal: 10, prijsCenten: 5000, btw: 21 }), regel({ aantal: 4, prijsCenten: 2500, btw: 9, soort: "planten" })]));
    // 500,00 incl-berekend: 500+105 = 605,00 ; 100+9 = 109,00
    expect(t.totaalIncl).toBe(60500 + 10900);
    expect(t.btwGroepen.map((g) => g.tarief)).toEqual([21, 9]);
    expect(t.btwGroepen[0].btw).toBe(10500);
    expect(t.btwGroepen[1].btw).toBe(900);
    expect(t.totaalExcl + t.totaalBtw).toBe(t.totaalIncl);
    expect(t.toonIncl).toBe(true);
  });

  it("zakelijk: btw per tarief over de som excl. btw", () => {
    const t = berekenTotalen(inhoud([regel({ prijsCenten: 3333 }), regel({ prijsCenten: 3333 }), regel({ prijsCenten: 3333 })], zakelijk));
    expect(t.toonIncl).toBe(false);
    expect(t.totaalExcl).toBe(9999);
    expect(t.totaalBtw).toBe(Math.round(9999 * 0.21));
    expect(t.totaalIncl).toBe(9999 + 2100);
  });

  it("KOR: geen btw, totaal gelijk aan som", () => {
    const t = berekenTotalen(inhoud([regel({ prijsCenten: 12345 }), regel({ prijsCenten: 100, btw: 9 })], particulier, kor));
    expect(t.kor).toBe(true);
    expect(t.totaalBtw).toBe(0);
    expect(t.totaalIncl).toBe(12445);
    expect(t.btwGroepen).toEqual([{ tarief: 0, grondslag: 12445, btw: 0 }]);
  });

  it("korting per regel, afgerond op centen", () => {
    expect(regelBedragExcl({ type: "normaal", aantal: 3, prijsCenten: 3333, kortingPct: 10 })).toBe(9999 - 1000); // 9999 - round(999,9)
    const t = berekenTotalen(inhoud([regel({ aantal: 3, prijsCenten: 3333, kortingPct: 10 })], zakelijk));
    expect(t.totaalExcl).toBe(8999);
  });

  it("optionele regels tellen pas mee als gekozen; tekstregels hebben geen bedrag; stelposten tellen mee", () => {
    const opt = regel({ type: "optioneel", prijsCenten: 20000 });
    const stel = regel({ type: "stelpost", prijsCenten: 5000 });
    const tekst = regel({ type: "tekst", prijsCenten: 99999 });
    const basis = regel({ prijsCenten: 10000 });
    const zonder = berekenTotalen(inhoud([basis, stel, opt, tekst], zakelijk));
    expect(zonder.totaalExcl).toBe(15000);
    expect(zonder.optioneelNietGekozenIncl).toBe(24200);
    const met = berekenTotalen(inhoud([basis, stel, opt, tekst], zakelijk), [opt.id]);
    expect(met.totaalExcl).toBe(35000);
    expect(met.optioneelNietGekozenIncl).toBe(0);
    expect(met.regels[tekst.id].excl).toBe(0);
  });

  it("afronding per regel: 7,3333 dagdelen × € 180,00", () => {
    const t = berekenTotalen(inhoud([regel({ aantal: 7.3333, prijsCenten: 18000 })], zakelijk));
    expect(t.totaalExcl).toBe(Math.round(7.3333 * 18000));
  });

  it("particulier: som van de regels incl. btw is gelijk aan het totaal", () => {
    const regels = [1, 2, 3, 4, 5, 6, 7].map((i) => regel({ aantal: i + 0.333, prijsCenten: 1234 + i * 11 }));
    const t = berekenTotalen(inhoud(regels));
    const som = regels.reduce((s, r) => s + t.regels[r.id].incl, 0);
    expect(t.totaalIncl).toBe(som);
  });
});

// #76: aantal × getoonde prijs moet het getoonde regeltotaal zijn (rekenregel 3, particulier).
describe("berekenTotalen met rekenregel 3 (particulier: aantal × prijs = regeltotaal)", () => {
  const met3 = (regels: OfferteRegel[], klant = particulier, a = afzender) => ({ ...inhoud(regels, klant, a), rekenregel: 3 as const });

  it("24 × € 88,87 en 17 × € 20,70 (de regels uit factuur F2026-0003)", () => {
    const r1 = regel({ aantal: 24, prijsCenten: 7345, btw: 21 }); // € 73,45 excl. = € 88,87 incl.
    const r2 = regel({ aantal: 17, prijsCenten: 1900, btw: 9 }); // € 19,00 excl. = € 20,71 incl.
    const t = berekenTotalen(met3([r1, r2]));
    expect(prijsPerEenheidWeergave(r1, true, false)).toBe(8887);
    expect(t.regels[r1.id].incl).toBe(24 * 8887); // 2.132,88
    expect(t.regels[r2.id].incl).toBe(17 * prijsPerEenheidWeergave(r2, true, false));
    expect(t.totaalIncl).toBe(t.regels[r1.id].incl + t.regels[r2.id].incl);
    expect(t.totaalExcl + t.totaalBtw).toBe(t.totaalIncl);
  });

  it("voor elke combinatie van aantal en prijs is aantal × getoonde prijs gelijk aan het regeltotaal", () => {
    for (const prijsCenten of [1, 99, 1234, 7345, 1999, 20700 / 1.09, 33333]) {
      for (const aantal of [1, 2, 3, 7, 17, 24, 99, 2.5]) {
        for (const btw of [21, 9, 0]) {
          const r = regel({ aantal, prijsCenten: Math.round(prijsCenten), btw });
          const t = berekenTotalen(met3([r]));
          const verwacht = Math.round(aantal * prijsPerEenheidWeergave(r, true, false));
          expect(t.regels[r.id].incl, `${aantal} × ${prijsCenten} @ ${btw}%`).toBe(verwacht);
          expect(t.regels[r.id].incl - t.regels[r.id].excl, "btw = incl − excl").toBe(t.totaalBtw);
        }
      }
    }
  });

  it("de btw per tarief telt op tot de totaalbtw; zakelijk en KOR rekenen ongewijzigd", () => {
    const regels = [regel({ aantal: 24, prijsCenten: 7345, btw: 21 }), regel({ aantal: 17, prijsCenten: 1900, btw: 9 })];
    const t3 = berekenTotalen(met3(regels));
    expect(t3.btwGroepen.reduce((s, g) => s + g.btw, 0)).toBe(t3.totaalBtw);
    for (const [klant, a] of [[zakelijk, afzender], [particulier, kor]] as const) {
      const oud = berekenTotalen({ ...inhoud(regels, klant, a), rekenregel: 2 as const });
      const nieuw = berekenTotalen(met3(regels, klant, a));
      expect(nieuw.totaalIncl).toBe(oud.totaalIncl);
      expect(nieuw.totaalExcl).toBe(oud.totaalExcl);
    }
  });

  it("korting wordt op het regeltotaal incl. btw toegepast", () => {
    const r = regel({ aantal: 10, prijsCenten: 7345, btw: 21, kortingPct: 10 });
    const t = berekenTotalen(met3([r]));
    expect(t.regels[r.id].incl).toBe(88870 - 8887);
  });

  it("offertes zonder rekenregel (of met 2) rekenen exact zoals voorheen", () => {
    const r = regel({ aantal: 24, prijsCenten: 7345, btw: 21 });
    expect(berekenTotalen(inhoud([r])).regels[r.id].incl).toBe(Math.round(24 * 7345) + Math.round(24 * 7345 * 0.21));
  });
});
