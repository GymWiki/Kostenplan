import { describe, expect, it } from "vitest";
import { bouwAfwijzing, STANDAARD_AFWIJZING_TEKST } from "./afwijzingsmail";
import { STANDAARD_MELDING_BUITEN } from "./teksten";
import { leadMarkeringen, afstandTekst } from "./lead-markeringen";

describe("afwijzingsmail", () => {
  it("gebruikt de standaardtekst als er niets is ingevuld en vult naam en bedrijf in", () => {
    const m = bouwAfwijzing({ onderwerp: "", tekst: "" }, "Jan", "Groen BV");
    expect(m.onderwerp).toBe("Je aanvraag bij Groen BV");
    expect(m.tekst).toContain("Beste Jan,");
    expect(m.tekst).toContain(STANDAARD_MELDING_BUITEN);
    expect(m.tekst).toContain("Groen BV");
    expect(STANDAARD_AFWIJZING_TEKST).toContain("{naam}");
  });
  it("gebruikt de eigen tekst van de hovenier", () => {
    const m = bouwAfwijzing({ onderwerp: "Helaas {naam}", tekst: "Hoi {naam}, wij werken niet in jouw regio. {bedrijf}" }, "Els", "Tuin");
    expect(m).toEqual({ onderwerp: "Helaas Els", tekst: "Hoi Els, wij werken niet in jouw regio. Tuin" });
  });
});

describe("lead-markeringen", () => {
  it("leest markeringen en afstand uit de aanvraag", () => {
    expect(leadMarkeringen({})).toEqual([]);
    expect(leadMarkeringen({ markeringen: ["ONDER_MINIMUM"] })).toEqual(["ONDER_MINIMUM"]);
    const loc = { postcode: "1", huisnummer: "1", toevoeging: "", straat: "", plaats: "", lat: null, lon: null, afstandKm: 34, binnenWerkgebied: false as const, markeringen: ["BUITEN_WERKGEBIED" as const], gecontroleerd: true };
    expect(leadMarkeringen({ locatie: loc })).toEqual(["BUITEN_WERKGEBIED"]);
    expect(afstandTekst({ locatie: loc })).toBe("34 km");
    expect(afstandTekst({})).toBeNull();
  });
});
