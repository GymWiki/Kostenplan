import { describe, expect, it } from "vitest";
import { ontleedVoorwaarde, bouwVoorwaarde, legeConditie, type VoorwaardeGroep } from "./voorwaarde";
import type { BeschikbareVariabele } from "./variabelen-utils";
import type { Expression } from "@/app/lib/calculator-engine";

const NUMBER_VELDEN: BeschikbareVariabele[] = [
  { naam: "lengte", label: "Lengte", type: "NUMBER" },
  { naam: "poort", label: "Poort", type: "BOOLEAN" },
  { naam: "type", label: "Type", type: "OPTION", opties: [{ waarde: "hout", label: "Hout" }] },
  { naam: "extras", label: "Extra's", type: "OPTIONS", opties: [{ waarde: "hor", label: "Hor" }] },
];

describe("bouwVoorwaarde/ontleedVoorwaarde — round-trip (Deel 5/8 modulair: AND/OR + verplichtAls-condities)", () => {
  it("één conditie bouwt een kale comparator (geen EN/OF-wrapper)", () => {
    const groep: VoorwaardeGroep = { combinator: "EN", condities: [{ variabele: "lengte", operator: "GROTER_DAN", waarde: "10" }] };
    const expr = bouwVoorwaarde(groep, NUMBER_VELDEN);
    expect(expr).toEqual({ kind: "GROTER_DAN", links: { kind: "VARIABELE", naam: "lengte" }, rechts: { kind: "GETAL", waarde: 10 } });
  });

  it("meerdere condities bouwen een EN/OF-wrapper", () => {
    const groep: VoorwaardeGroep = {
      combinator: "OF",
      condities: [
        { variabele: "lengte", operator: "GROTER_DAN", waarde: "10" },
        { variabele: "poort", operator: "GELIJK_AAN", waarde: "waar" },
      ],
    };
    const expr = bouwVoorwaarde(groep, NUMBER_VELDEN);
    expect(expr?.kind).toBe("OF");
    expect((expr as Extract<Expression, { kind: "OF" }>).voorwaarden).toHaveLength(2);
  });

  it("BOOLEAN-conditie bouwt een BOOLEAN-vergelijking", () => {
    const groep: VoorwaardeGroep = { combinator: "EN", condities: [{ variabele: "poort", operator: "GELIJK_AAN", waarde: "waar" }] };
    const expr = bouwVoorwaarde(groep, NUMBER_VELDEN);
    expect(expr).toEqual({ kind: "GELIJK_AAN", links: { kind: "VARIABELE", naam: "poort" }, rechts: { kind: "BOOLEAN", waarde: true } });
  });

  it("OPTIONS-conditie (MEERKEUZE) bouwt altijd BEVAT, ongeacht gekozen operator", () => {
    const groep: VoorwaardeGroep = { combinator: "EN", condities: [{ variabele: "extras", operator: "BEVAT", waarde: "hor" }] };
    const expr = bouwVoorwaarde(groep, NUMBER_VELDEN);
    expect(expr).toEqual({ kind: "BEVAT", lijst: { kind: "VARIABELE", naam: "extras" }, waarde: { kind: "TEKST", waarde: "hor" } });
  });

  it("een lege groep (geen variabele gekozen) levert undefined", () => {
    expect(bouwVoorwaarde({ combinator: "EN", condities: [{ variabele: "", operator: "GELIJK_AAN", waarde: "" }] }, NUMBER_VELDEN)).toBeUndefined();
  });

  it("round-trip: bouwVoorwaarde -> ontleedVoorwaarde geeft dezelfde groep terug (single)", () => {
    const groep: VoorwaardeGroep = { combinator: "EN", condities: [{ variabele: "lengte", operator: "KLEINER_OF_GELIJK", waarde: "5" }] };
    const expr = bouwVoorwaarde(groep, NUMBER_VELDEN);
    expect(ontleedVoorwaarde(expr)).toEqual(groep);
  });

  it("round-trip: bouwVoorwaarde -> ontleedVoorwaarde geeft dezelfde groep terug (EN van twee condities)", () => {
    const groep: VoorwaardeGroep = {
      combinator: "EN",
      condities: [
        { variabele: "lengte", operator: "GROTER_DAN", waarde: "10" },
        { variabele: "type", operator: "GELIJK_AAN", waarde: "hout" },
      ],
    };
    const expr = bouwVoorwaarde(groep, NUMBER_VELDEN);
    expect(ontleedVoorwaarde(expr)).toEqual(groep);
  });

  it("ontleedVoorwaarde geeft null voor undefined en voor niet-bouwbare expressies (bijv. FORMULE-achtige structuren)", () => {
    expect(ontleedVoorwaarde(undefined)).toBeNull();
    expect(ontleedVoorwaarde({ kind: "ALS_DAN", voorwaarde: { kind: "BOOLEAN", waarde: true }, dan: { kind: "GETAL", waarde: 1 }, anders: { kind: "GETAL", waarde: 0 } })).toBeNull();
  });

  it("legeConditie kiest OPTIONS-velden automatisch met operator BEVAT", () => {
    expect(legeConditie([NUMBER_VELDEN[3]]).operator).toBe("BEVAT");
    expect(legeConditie([NUMBER_VELDEN[0]]).operator).toBe("GELIJK_AAN");
  });
});
