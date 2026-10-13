import { describe, expect, it } from "vitest";
import { afstandKm, rondKm } from "./afstand";
import { parseAdresInvoer, adresRegel } from "./adres-invoer";
import { formatReeksen, formatPostcode, parsePostcodes, postcodeCijfers, postcodeInReeksen } from "./postcodes";
import { LEGE_INSTELLINGEN, parseWerkgebied, resolveWerkgebied, isActief, meldingTekst, STANDAARD_MELDING_BUITEN } from "./schema";
import { valideerInstellingen } from "./valideer";

describe("postcodegebieden", () => {
  it("leest losse postcodes en reeksen, met komma's, spaties en regeleinden", () => {
    const p = parsePostcodes("8000-8099, 8101\n8200–8210;  8205");
    expect(p.fouten).toEqual([]);
    expect(p.reeksen).toEqual([[8000, 8099], [8101, 8101], [8200, 8210]]);
    expect(p.aantal).toBe(100 + 1 + 11);
    expect(formatReeksen(p.reeksen)).toBe("8000–8099, 8101, 8200–8210");
  });
  it("voegt aansluitende en overlappende reeksen samen", () => {
    expect(parsePostcodes("8000-8010, 8011-8020, 8015-8030").reeksen).toEqual([[8000, 8030]]);
  });
  it("meldt wat niet te lezen is", () => {
    const p = parsePostcodes("8000, abc, 80, 8100-8000, 0999");
    expect(p.fouten).toEqual(["abc", "80", "8100-8000", "0999"]);
    expect(p.reeksen).toEqual([[8000, 8000]]);
  });
  it("neemt een volledige postcode met letters als het viercijferige gebied", () => {
    expect(parsePostcodes("8011AB").reeksen).toEqual([[8011, 8011]]);
  });
  it("herkent wat de klant typt en test de randen van een reeks", () => {
    expect(postcodeCijfers("8011 ab")).toBe(8011);
    expect(postcodeCijfers("8011")).toBe(8011);
    expect(postcodeCijfers("801")).toBeNull();
    expect(postcodeCijfers("0123")).toBeNull();
    const r = parsePostcodes("8000-8099").reeksen;
    expect(postcodeInReeksen(8000, r)).toBe(true);
    expect(postcodeInReeksen(8099, r)).toBe(true);
    expect(postcodeInReeksen(7999, r)).toBe(false);
    expect(postcodeInReeksen(8100, r)).toBe(false);
    expect(formatPostcode("8011ab")).toBe("8011 AB");
  });
});

describe("afstand hemelsbreed", () => {
  it("Utrecht – Amsterdam is ongeveer 35 km", () => {
    const utrecht = { lat: 52.0907, lon: 5.1214 };
    const amsterdam = { lat: 52.3676, lon: 4.9041 };
    expect(afstandKm(utrecht, amsterdam)).toBeGreaterThan(33);
    expect(afstandKm(utrecht, amsterdam)).toBeLessThan(37);
  });
  it("is symmetrisch en nul voor hetzelfde punt", () => {
    const a = { lat: 51.5, lon: 5.5 };
    const b = { lat: 53.2, lon: 6.5 };
    expect(afstandKm(a, b)).toBeCloseTo(afstandKm(b, a), 9);
    expect(afstandKm(a, a)).toBe(0);
    expect(rondKm(12.34)).toBe(12.3);
  });
});

describe("adres typen", () => {
  it("leest postcode, huisnummer en toevoeging", () => {
    expect(parseAdresInvoer("8011 ab 12")).toEqual({ postcode: "8011AB", huisnummer: "12", toevoeging: "" });
    expect(parseAdresInvoer("8011AB 12a")).toEqual({ postcode: "8011AB", huisnummer: "12", toevoeging: "a" });
    expect(parseAdresInvoer("8011 AB 12-3")).toEqual({ postcode: "8011AB", huisnummer: "12", toevoeging: "3" });
    expect(parseAdresInvoer("8011 AB")).toBeNull();
    expect(parseAdresInvoer("Dennenlaan 12")).toBeNull();
    expect(adresRegel({ straat: "Dennenlaan", huisnummer: "12", postcode: "3511AB", plaats: "Utrecht" })).toBe("Dennenlaan 12, 3511 AB Utrecht");
  });
});

describe("instellingen", () => {
  it("staat standaard alles uit en een kapotte opslag telt als uit", () => {
    expect(LEGE_INSTELLINGEN.werkgebied.aan).toBe(false);
    expect(LEGE_INSTELLINGEN.minimum.aan).toBe(false);
    expect(isActief(LEGE_INSTELLINGEN)).toBe(false);
    expect(parseWerkgebied(null)).toEqual(LEGE_INSTELLINGEN);
    expect(parseWerkgebied({ werkgebied: { straalKm: "veel" } })).toEqual(LEGE_INSTELLINGEN);
    expect(parseWerkgebied("kapot")).toEqual(LEGE_INSTELLINGEN);
  });
  it("een rekentool neemt het bedrijf over of heeft een eigen instelling", () => {
    const bedrijf = { werkgebied: { aan: true, straalKm: 25 }, minimum: { aan: true, bedragEuro: 200 } };
    expect(resolveWerkgebied(bedrijf, null).werkgebied.straalKm).toBe(25);
    expect(resolveWerkgebied(bedrijf, { werkgebied: { aan: false } }).werkgebied.aan).toBe(false);
    expect(resolveWerkgebied(bedrijf, { werkgebied: { aan: false } }).minimum.aan).toBe(false);
  });
  it("gebruikt de standaardmelding tenzij de hovenier een eigen tekst schreef", () => {
    expect(meldingTekst(LEGE_INSTELLINGEN.werkgebied)).toBe(STANDAARD_MELDING_BUITEN);
    expect(meldingTekst({ ...LEGE_INSTELLINGEN.werkgebied, melding: "  Wij werken alleen in Zwolle.  " })).toBe("Wij werken alleen in Zwolle.");
  });
});

describe("controle van instellingen", () => {
  const start = { postcode: "8011AB", huisnummer: "1", toevoeging: "", straat: "Straat", plaats: "Zwolle", lat: 52.5, lon: 6.1 };
  const basis = (w: object, m: object = {}) => ({ werkgebied: { aan: true, ...w }, minimum: m });
  it("eist een startadres bij een straal en postcodes bij postcodegebieden", () => {
    expect(valideerInstellingen(basis({ methode: "STRAAL" })).ok).toBe(false);
    expect(valideerInstellingen(basis({ methode: "STRAAL", start })).ok).toBe(true);
    expect(valideerInstellingen(basis({ methode: "POSTCODES", postcodes: "" })).ok).toBe(false);
    expect(valideerInstellingen(basis({ methode: "POSTCODES", postcodes: "8000-8099" })).ok).toBe(true);
    expect(valideerInstellingen(basis({ methode: "POSTCODES", postcodes: "8000, xx" })).ok).toBe(false);
  });
  it("een afstandstoeslag kan alleen bij een straal, met oplopende zones die eindigen op 'en verder'", () => {
    expect(valideerInstellingen(basis({ methode: "POSTCODES", postcodes: "8000", buiten: "TOESLAG" })).ok).toBe(false);
    const zones = (z: object[]) => basis({ start, buiten: "TOESLAG", toeslag: { modus: "ZONES", perKmEuro: 0, zones: z } });
    expect(valideerInstellingen(zones([{ totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }])).ok).toBe(true);
    expect(valideerInstellingen(zones([{ totKm: 40, bedragEuro: 35 }, { totKm: 30, bedragEuro: 50 }, { totKm: null, bedragEuro: null }])).ok).toBe(false);
    expect(valideerInstellingen(zones([{ totKm: 40, bedragEuro: 35 }])).ok).toBe(false);
  });
  it("een minimum heeft een bedrag nodig", () => {
    expect(valideerInstellingen({ minimum: { aan: true, bedragEuro: 0 } }).ok).toBe(false);
    expect(valideerInstellingen({ minimum: { aan: true, bedragEuro: 150 } }).ok).toBe(true);
  });
});
