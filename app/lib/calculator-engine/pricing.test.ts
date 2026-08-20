import { describe, expect, it } from "vitest";
import { berekenStaffelBedrag, evaluatePriceRules } from "./pricing";
import { RUNNING_SUBTOTAL_VARIABLE, type Expression, type PriceRule } from "./types";

const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });
const variabele = (naam: string): Expression => ({ kind: "VARIABELE", naam });

function basisRegel(overrides: Partial<PriceRule> & Pick<PriceRule, "id" | "type" | "categorie">) {
  return {
    label: overrides.id,
    actief: true,
    toonInUitsplitsing: true,
    intern: false,
    ...overrides,
  } as PriceRule;
}

describe("evaluatePriceRules — de voorbeelden uit de opdracht (Deel 42)", () => {
  it("Vast: 250 -> 250", () => {
    const regel = basisRegel({ id: "r1", type: "VAST", categorie: "OVERIG", bedrag: getal(250) });
    const { subtotaal } = evaluatePriceRules([regel], {});
    expect(subtotaal).toBe(250);
  });

  it("Per meter: 24 x 95 = 2280", () => {
    const regel = basisRegel({
      id: "r1",
      type: "PER_EENHEID",
      categorie: "MATERIAAL",
      hoeveelheid: variabele("lengte"),
      prijsPerEenheid: getal(95),
      eenheid: "meter",
    });
    const { subtotaal } = evaluatePriceRules([regel], { lengte: 24 });
    expect(subtotaal).toBe(2280);
  });

  it("Oppervlakte: 5 x 4 x 25 = 500 (oppervlakte x prijs per m2)", () => {
    const regel = basisRegel({
      id: "r1",
      type: "PER_EENHEID",
      categorie: "MATERIAAL",
      hoeveelheid: { kind: "VERMENIGVULDIGEN", factoren: [variabele("lengte"), variabele("breedte")] },
      prijsPerEenheid: getal(25),
      eenheid: "m2",
    });
    const { subtotaal } = evaluatePriceRules([regel], { lengte: 5, breedte: 4 });
    expect(subtotaal).toBe(500);
  });

  it("Percentage: 1000 + 10% = 1100", () => {
    const basisRegel1 = basisRegel({ id: "basis", type: "VAST", categorie: "MATERIAAL", bedrag: getal(1000) });
    const toeslag = basisRegel({
      id: "toeslag",
      type: "PERCENTAGE",
      categorie: "TOESLAG",
      basis: variabele(RUNNING_SUBTOTAL_VARIABLE),
      percentage: getal(10),
    });
    const { subtotaal } = evaluatePriceRules([basisRegel1, toeslag], {});
    expect(subtotaal).toBe(1100);
  });

  it("Korting: 1000 - 10% = 900", () => {
    const basisRegel1 = basisRegel({ id: "basis", type: "VAST", categorie: "MATERIAAL", bedrag: getal(1000) });
    const korting = basisRegel({ id: "korting", type: "KORTING", categorie: "KORTING", percentage: getal(10) });
    const { subtotaal, lineItems } = evaluatePriceRules([basisRegel1, korting], {});
    expect(subtotaal).toBe(900);
    expect(lineItems.find((i) => i.ruleId === "korting")?.bedrag).toBe(-100);
  });

  it("Conditioneel: bereikbaarheid slecht -> +15%", () => {
    const arbeid = basisRegel({ id: "arbeid", type: "VAST", categorie: "ARBEID", bedrag: getal(1000) });
    const toeslag = basisRegel({
      id: "toeslag",
      type: "PERCENTAGE",
      categorie: "TOESLAG",
      basis: variabele(RUNNING_SUBTOTAL_VARIABLE),
      percentage: getal(15),
      voorwaarde: { kind: "GELIJK_AAN", links: variabele("bereikbaarheid"), rechts: { kind: "TEKST", waarde: "slecht" } },
    });

    const slecht = evaluatePriceRules([arbeid, toeslag], { bereikbaarheid: "slecht" });
    expect(slecht.subtotaal).toBe(1150);

    const goed = evaluatePriceRules([arbeid, toeslag], { bereikbaarheid: "goed" });
    expect(goed.subtotaal).toBe(1000);
  });

  it("Staffel: progressief per schijf", () => {
    // 0-10m @ 100, 11-25m @ 90, 26+ @ 80
    const schijven = [
      { tot: 10, prijsPerEenheid: 100 },
      { tot: 25, prijsPerEenheid: 90 },
      { tot: null, prijsPerEenheid: 80 },
    ];
    expect(berekenStaffelBedrag(10, schijven)).toBe(1000); // 10 x 100
    expect(berekenStaffelBedrag(20, schijven)).toBe(10 * 100 + 10 * 90); // 1000 + 900 = 1900
    expect(berekenStaffelBedrag(30, schijven)).toBe(10 * 100 + 15 * 90 + 5 * 80); // 1000+1350+400=2750
  });

  it("Combinatie: materiaal + arbeid + transport + toeslag - korting = totaal", () => {
    const materiaal = basisRegel({ id: "materiaal", type: "VAST", categorie: "MATERIAAL", bedrag: getal(2650) });
    const arbeid = basisRegel({ id: "arbeid", type: "VAST", categorie: "ARBEID", bedrag: getal(950) });
    const transport = basisRegel({ id: "transport", type: "VAST", categorie: "TRANSPORT", bedrag: getal(75) });
    const toeslag = basisRegel({ id: "toeslag", type: "TOESLAG", categorie: "TOESLAG", bedrag: getal(150) });
    const korting = basisRegel({ id: "korting", type: "KORTING", categorie: "KORTING", bedrag: getal(100) });

    const { subtotaal } = evaluatePriceRules([materiaal, arbeid, transport, toeslag, korting], {});
    expect(subtotaal).toBe(2650 + 950 + 75 + 150 - 100);
  });
});

describe("evaluatePriceRules — regelgedrag", () => {
  it("negeert inactieve regels", () => {
    const regel = basisRegel({ id: "r1", type: "VAST", categorie: "OVERIG", bedrag: getal(100), actief: false });
    expect(evaluatePriceRules([regel], {}).subtotaal).toBe(0);
  });

  it("intern-regels tellen niet mee als alleenPubliek is gezet", () => {
    const regel = basisRegel({ id: "r1", type: "VAST", categorie: "OVERIG", bedrag: getal(100), intern: true });
    expect(evaluatePriceRules([regel], {}).subtotaal).toBe(100);
    expect(evaluatePriceRules([regel], {}, { alleenPubliek: true }).subtotaal).toBe(0);
  });

  it("een regel zonder voorwaarde geldt altijd", () => {
    const regel = basisRegel({ id: "r1", type: "VAST", categorie: "OVERIG", bedrag: getal(42) });
    expect(evaluatePriceRules([regel], {}).subtotaal).toBe(42);
  });
});
