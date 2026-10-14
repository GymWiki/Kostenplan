import { describe, expect, it } from "vitest";
import { parseEmbedParams, slugVan, vindOnderdeel, zuiverVariant } from "./embed-opties";

describe("embed-opties", () => {
  it("slug van een naam", () => {
    expect(slugVan("Bestrating / terras")).toBe("bestrating-terras");
    expect(slugVan("  Schutting ")).toBe("schutting");
    expect(slugVan("Één Ñandú!")).toBe("een-nandu");
  });

  it("vindt een onderdeel op id of op slug", () => {
    const p = [{ id: "abc1", naam: "Schutting" }, { id: "def2", naam: "Bestrating / terras" }];
    expect(vindOnderdeel(p, "def2")).toBe("def2");
    expect(vindOnderdeel(p, "schutting")).toBe("abc1");
    expect(vindOnderdeel(p, "Bestrating-terras")).toBe("def2");
    expect(vindOnderdeel(p, "bestaat-niet")).toBeNull();
    expect(vindOnderdeel(p, "")).toBeNull();
    expect(vindOnderdeel(p, null)).toBeNull();
  });

  it("controleert de parameters van de embed-pagina", () => {
    expect(parseEmbedParams({ weergave: "tegels", onderdelen: "a1,b2,<script>,a1", open: "schutting", modus: "popup" })).toEqual({ weergave: "tegels", onderdelen: ["a1", "b2"], open: "schutting", popup: true });
    expect(parseEmbedParams({ weergave: "raar", onderdelen: "!!!", open: "a b" })).toEqual({ weergave: undefined, onderdelen: undefined, open: undefined, popup: false });
    expect(parseEmbedParams({ weergave: ["stappen", "tegels"] }).weergave).toBe("stappen");
  });

  it("zuivert een variant", () => {
    expect(zuiverVariant({ weergave: "tegels", plaatsing: "popup", knopTekst: "  Bereken  ", knopPositie: "linksonder", onderdelen: ["a", "b b", "a"] })).toEqual({ weergave: "tegels", plaatsing: "popup", knopTekst: "Bereken", knopPositie: "linksonder", onderdelen: ["a"] });
    expect(zuiverVariant({ weergave: "x" as never, plaatsing: "y" as never })).toEqual({});
    expect(zuiverVariant(undefined)).toEqual({});
  });
});
