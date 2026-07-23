import { describe, expect, it } from "vitest";
import { mapFontFamilyToLettertype } from "./font-mapping";

describe("mapFontFamilyToLettertype", () => {
  it("herkent klassieke/serif-fonts", () => {
    expect(mapFontFamilyToLettertype("Playfair Display")).toBe("KLASSIEK");
    expect(mapFontFamilyToLettertype("Merriweather")).toBe("KLASSIEK");
    expect(mapFontFamilyToLettertype("Georgia")).toBe("KLASSIEK");
  });

  it("herkent vriendelijke/ronde fonts", () => {
    expect(mapFontFamilyToLettertype("Poppins")).toBe("VRIENDELIJK");
    expect(mapFontFamilyToLettertype("Quicksand")).toBe("VRIENDELIJK");
  });

  it("herkent stoere/robuuste fonts", () => {
    expect(mapFontFamilyToLettertype("Oswald")).toBe("STOER");
    expect(mapFontFamilyToLettertype("Bebas Neue")).toBe("STOER");
  });

  it("valt terug op MODERN voor onbekende fonts", () => {
    expect(mapFontFamilyToLettertype("Inter")).toBe("MODERN");
    expect(mapFontFamilyToLettertype("Some Random Font")).toBe("MODERN");
  });

  it("is niet hoofdlettergevoelig", () => {
    expect(mapFontFamilyToLettertype("POPPINS")).toBe("VRIENDELIJK");
  });
});
