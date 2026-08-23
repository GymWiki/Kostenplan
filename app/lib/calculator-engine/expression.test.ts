import { describe, expect, it } from "vitest";
import { evaluateAsBoolean, evaluateAsNumber, evaluateExpression, variabelenInExpressie } from "./expression";
import type { Expression } from "./types";

const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });
const variabele = (naam: string): Expression => ({ kind: "VARIABELE", naam });

describe("evaluateExpression — basisoperaties", () => {
  it("GETAL/BOOLEAN/TEKST leveren hun eigen waarde", () => {
    expect(evaluateExpression(getal(42), {})).toBe(42);
    expect(evaluateExpression({ kind: "BOOLEAN", waarde: true }, {})).toBe(true);
    expect(evaluateExpression({ kind: "TEKST", waarde: "hallo" }, {})).toBe("hallo");
  });

  it("VARIABELE zoekt op in de scope, ontbrekende variabele = 0", () => {
    expect(evaluateExpression(variabele("oppervlakte"), { oppervlakte: 24 })).toBe(24);
    expect(evaluateExpression(variabele("onbekend"), {})).toBe(0);
  });

  it("OPTELLEN/AFTREKKEN/VERMENIGVULDIGEN/DELEN rekenen numeriek", () => {
    expect(evaluateAsNumber({ kind: "OPTELLEN", termen: [getal(1), getal(2), getal(3)] }, {})).toBe(6);
    expect(evaluateAsNumber({ kind: "AFTREKKEN", links: getal(10), rechts: getal(4) }, {})).toBe(6);
    expect(evaluateAsNumber({ kind: "VERMENIGVULDIGEN", factoren: [getal(3), getal(4)] }, {})).toBe(12);
    expect(evaluateAsNumber({ kind: "DELEN", links: getal(9), rechts: getal(3) }, {})).toBe(3);
  });

  it("DELEN door nul geeft veilig 0 i.p.v. Infinity/NaN", () => {
    expect(evaluateAsNumber({ kind: "DELEN", links: getal(9), rechts: getal(0) }, {})).toBe(0);
  });

  it("PERCENTAGE_VAN: 1000 van 10% = 100", () => {
    expect(evaluateAsNumber({ kind: "PERCENTAGE_VAN", basis: getal(1000), percentage: getal(10) }, {})).toBe(100);
  });
});

describe("evaluateExpression — vergelijkingen en logica", () => {
  it("GELIJK_AAN vergelijkt tekst (OPTION-variabelen) correct", () => {
    expect(
      evaluateAsBoolean(
        { kind: "GELIJK_AAN", links: variabele("bereikbaarheid"), rechts: { kind: "TEKST", waarde: "slecht" } },
        { bereikbaarheid: "slecht" }
      )
    ).toBe(true);
    expect(
      evaluateAsBoolean(
        { kind: "GELIJK_AAN", links: variabele("bereikbaarheid"), rechts: { kind: "TEKST", waarde: "slecht" } },
        { bereikbaarheid: "goed" }
      )
    ).toBe(false);
  });

  it("GROTER_DAN/KLEINER_DAN/GROTER_OF_GELIJK/KLEINER_OF_GELIJK", () => {
    expect(evaluateAsBoolean({ kind: "GROTER_DAN", links: getal(100), rechts: getal(50) }, {})).toBe(true);
    expect(evaluateAsBoolean({ kind: "KLEINER_DAN", links: getal(100), rechts: getal(50) }, {})).toBe(false);
    expect(evaluateAsBoolean({ kind: "GROTER_OF_GELIJK", links: getal(50), rechts: getal(50) }, {})).toBe(true);
    expect(evaluateAsBoolean({ kind: "KLEINER_OF_GELIJK", links: getal(50), rechts: getal(50) }, {})).toBe(true);
  });

  it("EN/OF/NIET combineren voorwaarden", () => {
    const waar: Expression = { kind: "BOOLEAN", waarde: true };
    const onwaar: Expression = { kind: "BOOLEAN", waarde: false };
    expect(evaluateAsBoolean({ kind: "EN", voorwaarden: [waar, waar] }, {})).toBe(true);
    expect(evaluateAsBoolean({ kind: "EN", voorwaarden: [waar, onwaar] }, {})).toBe(false);
    expect(evaluateAsBoolean({ kind: "OF", voorwaarden: [onwaar, waar] }, {})).toBe(true);
    expect(evaluateAsBoolean({ kind: "NIET", voorwaarde: waar }, {})).toBe(false);
  });

  it("MINIMUM/MAXIMUM", () => {
    expect(evaluateAsNumber({ kind: "MINIMUM", waarden: [getal(5), getal(2), getal(8)] }, {})).toBe(2);
    expect(evaluateAsNumber({ kind: "MAXIMUM", waarden: [getal(5), getal(2), getal(8)] }, {})).toBe(8);
  });

  it("ALS_DAN kiest de juiste tak", () => {
    const expr: Expression = {
      kind: "ALS_DAN",
      voorwaarde: { kind: "GROTER_DAN", links: variabele("oppervlakte"), rechts: getal(100) },
      dan: getal(10),
      anders: getal(0),
    };
    expect(evaluateAsNumber(expr, { oppervlakte: 150 })).toBe(10);
    expect(evaluateAsNumber(expr, { oppervlakte: 50 })).toBe(0);
  });
});

describe("evaluateExpression — BEVAT (Levering B v2, MEERKEUZE-velden)", () => {
  it("BEVAT is waar als de waarde in de lijst-variabele zit", () => {
    const expr: Expression = {
      kind: "BEVAT",
      lijst: variabele("extras"),
      waarde: { kind: "TEKST", waarde: "hor" },
    };
    expect(evaluateAsBoolean(expr, { extras: ["hor", "verlichting"] })).toBe(true);
    expect(evaluateAsBoolean(expr, { extras: ["verlichting"] })).toBe(false);
    expect(evaluateAsBoolean(expr, { extras: [] })).toBe(false);
    expect(evaluateAsBoolean(expr, {})).toBe(false);
  });

  it("een scalaire string-variabele telt als lijst met één element", () => {
    const expr: Expression = { kind: "BEVAT", lijst: variabele("optie"), waarde: { kind: "TEKST", waarde: "hor" } };
    expect(evaluateAsBoolean(expr, { optie: "hor" })).toBe(true);
    expect(evaluateAsBoolean(expr, { optie: "verlichting" })).toBe(false);
  });

  it("variabelenInExpressie vindt beide operanden van BEVAT", () => {
    const expr: Expression = { kind: "BEVAT", lijst: variabele("extras"), waarde: variabele("gezocht") };
    expect([...variabelenInExpressie(expr)].sort()).toEqual(["extras", "gezocht"]);
  });
});

describe("variabelenInExpressie", () => {
  it("vindt alle variabelenamen in een geneste expressie", () => {
    const expr: Expression = {
      kind: "ALS_DAN",
      voorwaarde: { kind: "GELIJK_AAN", links: variabele("bereikbaarheid"), rechts: { kind: "TEKST", waarde: "slecht" } },
      dan: { kind: "VERMENIGVULDIGEN", factoren: [variabele("oppervlakte"), variabele("prijs")] },
      anders: getal(0),
    };
    expect([...variabelenInExpressie(expr)].sort()).toEqual(["bereikbaarheid", "oppervlakte", "prijs"]);
  });

  it("geeft een lege set voor een expressie zonder variabelen", () => {
    expect(variabelenInExpressie(getal(5)).size).toBe(0);
  });
});
