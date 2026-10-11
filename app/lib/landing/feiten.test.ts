import { describe, expect, it } from "vitest";
import { VRAGEN, VERGELIJKING, DEFINITIE } from "./feiten";

describe("landing-feiten", () => {
  it("elk antwoord is 40-60 woorden", () => {
    for (const v of VRAGEN) {
      const n = v.antwoord.split(/\s+/).length;
      expect(n, v.vraag).toBeGreaterThanOrEqual(40);
      expect(n, v.vraag).toBeLessThanOrEqual(60);
    }
  });
  it("de vergelijking heeft drie waarden per rij", () => {
    for (const r of VERGELIJKING) expect(r.waarden).toHaveLength(3);
  });
  it("de definitiezin noemt hoveniers", () => {
    expect(DEFINITIE).toMatch(/hoveniers in Nederland/);
  });
});
