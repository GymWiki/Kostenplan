import { describe, expect, it } from "vitest";
import { heeftBlokkerendeFouten, valideerCalculatorConfig } from "./validate";
import { legeCalculatorConfig } from "./config";
import type { CalculatorField, CalculatorConfigData, Expression, PriceRule } from "./types";

const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });
const variabele = (naam: string): Expression => ({ kind: "VARIABELE", naam });

function config(overrides: Partial<CalculatorConfigData>): CalculatorConfigData {
  return { ...legeCalculatorConfig(), ...overrides };
}

describe("valideerCalculatorConfig", () => {
  it("een lege configuratie levert een fout op (geen prijsregels)", () => {
    const meldingen = valideerCalculatorConfig(legeCalculatorConfig());
    expect(heeftBlokkerendeFouten(meldingen)).toBe(true);
  });

  it("meldt een prijsregel die een niet-bestaande vraag gebruikt (Deel 32, voorbeeld 1)", () => {
    const regel: PriceRule = {
      id: "r1",
      label: "Materiaal",
      categorie: "MATERIAAL",
      type: "PER_EENHEID",
      hoeveelheid: variabele("oppervlakte"),
      prijsPerEenheid: getal(25),
      eenheid: "m2",
      actief: true,
      toonInUitsplitsing: true,
      intern: false,
    };
    const meldingen = valideerCalculatorConfig(config({ regels: [regel] }));
    expect(heeftBlokkerendeFouten(meldingen)).toBe(true);
    expect(meldingen.some((m) => m.boodschap.includes("oppervlakte"))).toBe(true);
  });

  it("geen fout als de gebruikte variabele wél bestaat (via een veld)", () => {
    const veld: CalculatorField = { id: "lengte", label: "Lengte", soort: "NUMMER", verplicht: true };
    const regel: PriceRule = {
      id: "r1",
      label: "Materiaal",
      categorie: "MATERIAAL",
      type: "PER_EENHEID",
      hoeveelheid: variabele("lengte"),
      prijsPerEenheid: getal(95),
      eenheid: "meter",
      actief: true,
      toonInUitsplitsing: true,
      intern: false,
    };
    const meldingen = valideerCalculatorConfig(config({ velden: [veld], regels: [regel] }));
    expect(heeftBlokkerendeFouten(meldingen)).toBe(false);
  });

  it("waarschuwt voor een vraag zonder invloed op de berekening (Deel 32, voorbeeld 3)", () => {
    const veld: CalculatorField = { id: "opmerking", label: "Opmerking", soort: "TEKST", verplicht: false };
    const regel: PriceRule = {
      id: "r1",
      label: "Vast",
      categorie: "OVERIG",
      type: "VAST",
      bedrag: getal(100),
      actief: true,
      toonInUitsplitsing: true,
      intern: false,
    };
    const meldingen = valideerCalculatorConfig(config({ velden: [veld], regels: [regel] }));
    expect(meldingen.some((m) => m.ernst === "WAARSCHUWING" && m.veldId === "opmerking")).toBe(true);
  });

  it("meldt een korting zonder bedrag of percentage", () => {
    const regel: PriceRule = {
      id: "r1",
      label: "Korting",
      categorie: "KORTING",
      type: "KORTING",
      actief: true,
      toonInUitsplitsing: true,
      intern: false,
    };
    const meldingen = valideerCalculatorConfig(config({ regels: [regel] }));
    expect(heeftBlokkerendeFouten(meldingen)).toBe(true);
  });

  it("meldt een staffel zonder schijven", () => {
    const regel: PriceRule = {
      id: "r1",
      label: "Staffel",
      categorie: "MATERIAAL",
      type: "STAFFEL",
      hoeveelheid: getal(10),
      eenheid: "meter",
      schijven: [],
      actief: true,
      toonInUitsplitsing: true,
      intern: false,
    };
    const meldingen = valideerCalculatorConfig(config({ regels: [regel] }));
    expect(heeftBlokkerendeFouten(meldingen)).toBe(true);
  });
});
