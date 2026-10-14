import { describe, expect, it } from "vitest";
import { parseWeergaveConfig, STANDAARD_WEERGAVE_CONFIG } from "./config";

describe("parseWeergaveConfig", () => {
  it("een bestaande rekentool (leeg of ongeldig) blijft 'Alles op één pagina'", () => {
    for (const j of [{}, null, undefined, "x", [], { weergave: "raar" }]) {
      expect(parseWeergaveConfig(j)).toEqual(STANDAARD_WEERGAVE_CONFIG);
    }
    expect(STANDAARD_WEERGAVE_CONFIG.weergave).toBe("lijst");
  });

  it("neemt geldige keuzes over en begrenst teksten", () => {
    const c = parseWeergaveConfig({ weergave: "stappen", plaatsing: "popup", knopTekst: "x".repeat(99), knopPositie: "linksonder", prijsNaContact: true, onderdelen: { a: { tegelTekst: "y".repeat(80), voorbeeldmaat: 12 }, b: { tegelTekst: "  ", voorbeeldmaat: -1 }, c: 5 } });
    expect(c.weergave).toBe("stappen");
    expect(c.plaatsing).toBe("popup");
    expect(c.knopTekst).toHaveLength(40);
    expect(c.knopPositie).toBe("linksonder");
    expect(c.prijsNaContact).toBe(true);
    expect(c.tip).toBe(false);
    expect(parseWeergaveConfig({ tip: true }).tip).toBe(true);
    expect(c.onderdelen).toEqual({ a: { tegelTekst: "y".repeat(40), voorbeeldmaat: 12 } });
  });
});
