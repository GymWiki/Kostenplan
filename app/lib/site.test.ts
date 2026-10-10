import { describe, expect, it } from "vitest";
import { normaliseerSite } from "./site";

describe("normaliseerSite", () => {
  it("haalt protocol, pad en hoofdletters weg", () => {
    expect(normaliseerSite("https://www.Voorbeeld.nl/over-ons?x=1")).toBe("www.voorbeeld.nl");
    expect(normaliseerSite("  voorbeeld.nl ")).toBe("voorbeeld.nl");
  });
  it("weigert alles wat geen website is", () => {
    for (const s of ["", "javascript:alert(1)", "file:///etc/passwd", "localhost", "127.0.0.1", "geen website", "a.b", "<script>.nl"]) {
      expect(normaliseerSite(s)).toBe("");
    }
  });
});
