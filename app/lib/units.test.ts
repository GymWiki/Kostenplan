import { describe, expect, it } from "vitest";
import { CUSTOM_UNIT_VALUE, UNIT_GROUPS, isKnownUnit, unitLabel } from "./units";

describe("unitLabel", () => {
  it("geeft het nette label terug voor bekende, bestaande eenheden", () => {
    expect(unitLabel("m1")).toBe("m¹");
    expect(unitLabel("m2")).toBe("m²");
    expect(unitLabel("m3")).toBe("m³");
    expect(unitLabel("stuks")).toBe("stuks");
  });

  it("toont een eigen/onbekende eenheid precies zoals opgeslagen", () => {
    expect(unitLabel("strekkende voet")).toBe("strekkende voet");
    expect(unitLabel("m2 beplanting")).toBe("m2 beplanting");
  });
});

describe("isKnownUnit", () => {
  it("herkent alle waarden uit UNIT_GROUPS", () => {
    for (const group of UNIT_GROUPS) {
      for (const optie of group.opties) {
        expect(isKnownUnit(optie.value)).toBe(true);
      }
    }
  });

  it("herkent een eigen eenheid niet als bekend, zodat het formulier in eigen-modus opent", () => {
    expect(isKnownUnit("strekkende voet")).toBe(false);
    expect(isKnownUnit(CUSTOM_UNIT_VALUE)).toBe(false);
  });
});

describe("bestaande eenheden blijven ongewijzigd", () => {
  it("m1/m2/m3/stuks staan nog exact in de lijst (geen migratie van opgeslagen waarden nodig)", () => {
    const alleWaarden = UNIT_GROUPS.flatMap((g) => g.opties.map((o) => o.value));
    expect(alleWaarden).toContain("m1");
    expect(alleWaarden).toContain("m2");
    expect(alleWaarden).toContain("m3");
    expect(alleWaarden).toContain("stuks");
  });
});
