import { describe, expect, it } from "vitest";
import { aftrekSectie, creditnotaUitFactuur, eenFactuurUitOfferte, eindfactuurUitOfferte, losseFactuur, plusDagen, regelsVoorFactuur, termijnFactuurUitOfferte, termijnPlan, voegMeerwerkToe, type OfferteBron } from "./maak";
import { factuurTotalen } from "./totalen";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { controleerFactuur, termijnWaarschuwing, uiterlijkVersturen } from "./controle";
import { AFZENDER_OK, factuurInhoud, regel } from "./test-helpers";
import type { OfferteInhoud } from "@/app/lib/offerte/model";

const NU = new Date("2026-10-20T10:00:00Z");
const inst = { betaaltermijnDagen: 14, nu: NU };

function offerte(opties: { zakelijk?: boolean; kor?: boolean; regels?: OfferteInhoud["secties"][number]["regels"] } = {}): OfferteBron {
  const regels = opties.regels ?? [
    regel("a", "Bestrating terras", 24, 7345, 21),
    regel("b", "Haag planten", 17, 1899, 9),
    { ...regel("c", "Grondwerk (stelpost)", 1, 40000, 21), type: "stelpost" },
    { ...regel("d", "Verlichting", 1, 25000, 21), type: "optioneel" },
    { ...regel("e", "Extra haag", 5, 1500, 9), type: "optioneel" },
  ];
  const inhoud = {
    ...factuurInhoud({ zakelijk: opties.zakelijk, kor: opties.kor }),
    nummer: "2026-0012",
    secties: [{ id: "s1", titel: "Aanleg", regels }],
    betaaltermijnen: [{ label: "Aanbetaling", percentage: 30 }, { label: "Bij oplevering", percentage: 70 }],
  } as OfferteInhoud;
  return { inhoud, gekozenOptioneel: ["d"], nummer: "2026-0012", versie: 1 };
}

describe("een factuur uit de offerte", () => {
  it("neemt alle regels over, alleen de gekozen optionele, en markeert stelposten", () => {
    const f = eenFactuurUitOfferte(offerte(), inst);
    const regels = f.secties.flatMap((s) => s.regels);
    expect(regels.map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
    expect(regels.find((r) => r.id === "d")?.type).toBe("normaal");
    expect(regels.find((r) => r.id === "c")).toMatchObject({ type: "normaal", label: "stelpost-open", toelichting: "Te bepalen bij nacalculatie" });
    expect(f.factuur).toMatchObject({ soort: "factuur", nummer: null, factuurdatum: "2026-10-20", vervaldatum: "2026-11-03", offerteNummer: "2026-0012" });
  });

  it("het totaal is gelijk aan dat van de offerte (met de gekozen optionele regels)", () => {
    const bron = offerte();
    const f = eenFactuurUitOfferte(bron, inst);
    const o = berekenTotalen({ ...bron.inhoud, rekenregel: 2 }, bron.gekozenOptioneel);
    expect(factuurTotalen(f).totaalInclCenten).toBe(o.totaalIncl);
    expect(factuurTotalen(f).btwGroepen).toEqual(o.btwGroepen);
  });

  it("gemengde btw 9% en 21%: de btw per tarief klopt en het totaal telt op", () => {
    const f = eenFactuurUitOfferte(offerte(), inst);
    const t = factuurTotalen(f);
    expect(t.btwGroepen.map((g) => g.tarief)).toEqual([21, 9]);
    expect(t.totaalExclCenten + t.totaalBtwCenten).toBe(t.totaalInclCenten);
    // de btw is per regel afgerond: per tarief hooguit een paar centen verschil met btw over de som
    for (const g of t.btwGroepen) expect(Math.abs(g.btw - Math.round((g.grondslag * g.tarief) / 100))).toBeLessThanOrEqual(3);
  });

  it("stelposten moeten een werkelijke hoeveelheid krijgen vóór definitief maken", () => {
    const f = eenFactuurUitOfferte(offerte(), inst);
    const c = controleerFactuur({ ...f, factuur: { ...f.factuur, uitvoeringVan: "2026-10-15" } }, NU);
    expect(c.blokkerend.map((p) => p.id)).toContain("stelpost");
    const klaar = { ...f, factuur: { ...f.factuur, uitvoeringVan: "2026-10-15" }, secties: f.secties.map((s) => ({ ...s, regels: s.regels.map((r) => (r.label === "stelpost-open" ? { ...r, aantal: 1.5, label: undefined, toelichting: "nacalculatie" } : r)) })) };
    expect(controleerFactuur(klaar, NU).blokkerend.map((p) => p.id)).not.toContain("stelpost");
  });
});

describe("termijnfacturen en eindfactuur", () => {
  it("plant alle termijnen behalve de laatste als termijnfactuur; één termijn is één factuur", () => {
    expect(termijnPlan([{ label: "Aanbetaling", percentage: 30 }, { label: "Bij oplevering", percentage: 70 }]).map((t) => t.soort)).toEqual(["termijn", "eindfactuur"]);
    expect(termijnPlan([{ label: "A", percentage: 30 }, { label: "B", percentage: 40 }, { label: "C", percentage: 30 }]).map((t) => t.soort)).toEqual(["termijn", "termijn", "eindfactuur"]);
    expect(termijnPlan([{ label: "Na oplevering", percentage: 100 }]).map((t) => t.soort)).toEqual(["factuur"]);
    expect(termijnPlan([])).toEqual([{ soort: "factuur", label: "Factuur", percentage: 100 }]);
  });

  it("een aanbetaling van 30%: één regel per btw-tarief met de juiste btw", () => {
    const bron = offerte();
    const f = termijnFactuurUitOfferte(bron, { label: "Aanbetaling", percentage: 30 }, inst);
    const regels = f.secties.flatMap((s) => s.regels);
    expect(regels).toHaveLength(2);
    expect(regels[0].omschrijving).toMatch(/Aanbetaling 30% – offerte 2026-0012 \(btw 21%\)/);
    const totaal = factuurTotalen(eenFactuurUitOfferte(bron, inst)).totaalInclCenten;
    expect(Math.abs(factuurTotalen(f).totaalInclCenten - Math.round(totaal * 0.3))).toBeLessThanOrEqual(2);
    expect(f.factuur).toMatchObject({ soort: "termijn", termijn: { label: "Aanbetaling", percentage: 30, offerteTotaalInclCenten: expect.any(Number) }, uitvoeringVan: "2026-10-20" });
  });

  it("de eindfactuur trekt eerder gefactureerde termijnen af: samen is het exact het offertetotaal", () => {
    for (const [zakelijk, kor] of [[false, false], [true, false], [false, true]] as const) {
      const bron = offerte({ zakelijk, kor });
      const t1 = termijnFactuurUitOfferte(bron, { label: "Aanbetaling", percentage: 30 }, inst);
      const t2 = termijnFactuurUitOfferte(bron, { label: "Tweede termijn", percentage: 40 }, inst);
      const eind = eindfactuurUitOfferte(bron, [{ nummer: "F2026-0004", inhoud: t1 }, { nummer: "F2026-0005", inhoud: t2 }], inst);
      const eerstvolgend = factuurTotalen(eenFactuurUitOfferte(bron, inst)).totaalInclCenten;
      const som = factuurTotalen(t1).totaalInclCenten + factuurTotalen(t2).totaalInclCenten + factuurTotalen(eind).totaalInclCenten;
      expect(som).toBe(eerstvolgend);
      // btw per tarief telt ook op
      const btwSom = factuurTotalen(t1).totaalBtwCenten + factuurTotalen(t2).totaalBtwCenten + factuurTotalen(eind).totaalBtwCenten;
      expect(btwSom).toBe(factuurTotalen(eenFactuurUitOfferte(bron, inst)).totaalBtwCenten);
      const aftrek = eind.secties.find((s) => s.titel === "Reeds gefactureerd")!.regels;
      expect(aftrek.every((r) => /^Reeds gefactureerd: F2026-000[45]$/.test(r.omschrijving) && r.prijsCenten < 0 && r.label === "reeds-gefactureerd")).toBe(true);
    }
  });

  it("de eindfactuur bevat meerwerk en nacalculatie naast de aftrek", () => {
    const bron = offerte();
    const t1 = termijnFactuurUitOfferte(bron, { label: "Aanbetaling", percentage: 30 }, inst);
    let eind = eindfactuurUitOfferte(bron, [{ nummer: "F2026-0004", inhoud: t1 }], inst);
    const zonder = factuurTotalen(eind).totaalInclCenten;
    eind = voegMeerwerkToe(eind, { omschrijving: "Extra afvoer grond", aantal: 3, eenheid: "m³", prijsCenten: 4500, btw: 21, notitie: "Akkoord klant op 14-10" });
    expect(factuurTotalen(eind).totaalInclCenten).toBe(zonder + 3 * 4500 + Math.round(3 * 4500 * 0.21));
    const mw = eind.secties.find((s) => s.titel === "Meerwerk")!.regels[0];
    expect(mw).toMatchObject({ label: "meerwerk", toelichting: "Akkoord klant op 14-10" });
    // tweede meerwerkregel komt in dezelfde sectie
    eind = voegMeerwerkToe(eind, { omschrijving: "Extra lamp", aantal: 1, eenheid: "stuk", prijsCenten: 8000, btw: 21 });
    expect(eind.secties.filter((s) => s.titel === "Meerwerk")).toHaveLength(1);
  });
});

describe("btw-modi", () => {
  it("KOR: geen btw berekend", () => {
    const f = eenFactuurUitOfferte(offerte({ kor: true }), inst);
    const t = factuurTotalen(f);
    expect(t.totaalBtwCenten).toBe(0);
    expect(t.totaalInclCenten).toBe(t.totaalExclCenten);
    expect(t.kor).toBe(true);
  });
  it("btw verlegd: geen btw, wel vermeld (zakelijk, met btw-id van de klant)", () => {
    const f = { ...eenFactuurUitOfferte(offerte({ zakelijk: true }), inst), factuur: { ...eenFactuurUitOfferte(offerte({ zakelijk: true }), inst).factuur, btwModus: "verlegd" as const, klantBtwId: "NL987654321B01", uitvoeringVan: "2026-10-15" } };
    const t = factuurTotalen(f);
    expect(t.verlegd).toBe(true);
    expect(t.totaalBtwCenten).toBe(0);
    expect(t.toonIncl).toBe(false);
    expect(controleerFactuur(f, NU).blokkerend.map((p) => p.id)).not.toContain("verlegd-btwid");
    // zonder btw-id van de klant, of bij een particulier, kan het niet
    expect(controleerFactuur({ ...f, factuur: { ...f.factuur, klantBtwId: "" } }, NU).blokkerend.map((p) => p.id)).toContain("verlegd-btwid");
    expect(controleerFactuur({ ...f, klant: { ...f.klant, type: "particulier" } }, NU).blokkerend.map((p) => p.id)).toContain("verlegd-klant");
  });
});

describe("creditnota", () => {
  const orig = () => {
    const f = eenFactuurUitOfferte(offerte(), inst);
    return { nummer: "F2026-0007", inhoud: { ...f, nummer: "F2026-0007", factuur: { ...f.factuur, nummer: "F2026-0007", uitvoeringVan: "2026-10-15" } } };
  };
  it("geheel crediteren: alle bedragen negatief, totaal is het negatieve van de factuur", () => {
    const o = orig();
    const c = creditnotaUitFactuur(o, inst);
    expect(factuurTotalen(c).totaalInclCenten).toBe(-factuurTotalen(o.inhoud).totaalInclCenten);
    expect(factuurTotalen(c).totaalBtwCenten).toBe(-factuurTotalen(o.inhoud).totaalBtwCenten);
    expect(c.factuur).toMatchObject({ soort: "creditnota", creditVoor: { nummer: "F2026-0007", datum: "2026-10-20" } });
    expect(c.secties.flatMap((s) => s.regels).every((r) => r.prijsCenten < 0 && r.aantal > 0)).toBe(true);
    expect(controleerFactuur(c, NU).blokkerend.map((p) => p.id)).not.toContain("credit-negatief");
  });
  it("deels crediteren: alleen de gekozen regels", () => {
    const o = orig();
    const c = creditnotaUitFactuur(o, inst, ["a"]);
    const verwacht = berekenTotalen({ ...o.inhoud, secties: [{ ...o.inhoud.secties[0], regels: o.inhoud.secties[0].regels.filter((r) => r.id === "a") }] }).totaalIncl;
    expect(factuurTotalen(c).totaalInclCenten).toBe(-verwacht);
    expect(c.secties.flatMap((s) => s.regels)).toHaveLength(1);
  });
  it("een creditnota zonder verwijzing of met een positief totaal kan niet definitief", () => {
    const c = creditnotaUitFactuur(orig(), inst);
    expect(controleerFactuur({ ...c, factuur: { ...c.factuur, creditVoor: undefined } }, NU).blokkerend.map((p) => p.id)).toContain("credit-verwijzing");
  });
});

describe("losse factuur en controle", () => {
  it("een losse factuur start met één lege regel en kan niet definitief zolang die op €0 staat", () => {
    const f = losseFactuur({ afzender: factuurInhoud().afzender, klant: { naam: "P. Bakker" } }, inst);
    expect(f.factuur.offerteNummer).toBe("");
    expect(controleerFactuur(f, NU).blokkerend.map((p) => p.id)).toEqual(expect.arrayContaining(["nulregels", "klantadres", "uitvoering"]));
  });
  it("verplichte bedrijfsgegevens ontbreken: definitief kan niet, met een link naar precies dat veld", () => {
    const base = factuurInhoud();
    const f = { ...base, factuur: { ...base.factuur, uitvoeringVan: "2026-10-15" } };
    expect(controleerFactuur(f, NU).blokkerend).toEqual([]);
    for (const [veld, href] of [["kvkNummer", "#og-kvkNummer"], ["btwId", "#og-btwId"], ["adresRegel", "#og-adresRegel"], ["iban", "#og-iban"]] as const) {
      const zonder = { ...f, afzender: { ...f.afzender, [veld]: "" } };
      const punten = controleerFactuur(zonder, NU).blokkerend;
      expect(punten.some((p) => p.href?.endsWith(href))).toBe(true);
    }
    // KOR: btw-id mag ontbreken
    expect(controleerFactuur({ ...f, afzender: { ...f.afzender, korActief: true, btwId: "" } }, NU).blokkerend).toEqual([]);
  });
  it("de factuurtermijn: uiterlijk de 15e van de maand na de uitvoering", () => {
    expect(uiterlijkVersturen("2026-10-15")).toBe("2026-11-15");
    expect(uiterlijkVersturen("2026-12-31")).toBe("2027-01-15");
    expect(termijnWaarschuwing("2026-10-15", new Date("2026-10-20T10:00:00Z"))).toBeNull();
    expect(termijnWaarschuwing("2026-10-15", new Date("2026-11-10T10:00:00Z"))).toMatchObject({ soort: "dreigt", uiterlijk: "2026-11-15", dagen: 5 });
    expect(termijnWaarschuwing("2026-10-15", new Date("2026-11-20T10:00:00Z"))).toMatchObject({ soort: "te-laat" });
  });
  it("hulpfuncties", () => {
    expect(plusDagen("2026-10-20", 14)).toBe("2026-11-03");
    expect(plusDagen("2026-12-25", 14)).toBe("2027-01-08");
    expect(regelsVoorFactuur({ secties: [{ id: "s", titel: "x", regels: [{ ...regel("t", "Tekst", 1, 0), type: "tekst" }] }] }, []).flatMap((s) => s.regels)).toHaveLength(1);
    expect(aftrekSectie([]).regels).toEqual([]);
    expect(AFZENDER_OK.kvkNummer).toBe("12345678");
  });
});
