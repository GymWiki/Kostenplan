import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  contrastAgainstWhite,
  isGrayscale,
  darkenUntilContrast,
  colorsAreDistinct,
  hexToHsl,
  hexToRgb,
  rgbToHex,
} from "./color";

describe("hexToRgb / rgbToHex", () => {
  it("converteert hex naar rgb en terug", () => {
    expect(hexToRgb("#15803d")).toEqual({ r: 0x15, g: 0x80, b: 0x3d });
    expect(rgbToHex({ r: 21, g: 128, b: 61 })).toBe("#15803d");
  });

  it("geeft null voor ongeldige hex", () => {
    expect(hexToRgb("groen")).toBeNull();
    expect(hexToRgb("#fff")).toBeNull(); // alleen 6-cijferige hex, geen 3-cijferige shorthand
  });
});

describe("isGrayscale", () => {
  it("herkent wit, zwart en grijstinten", () => {
    expect(isGrayscale("#ffffff")).toBe(true);
    expect(isGrayscale("#000000")).toBe(true);
    expect(isGrayscale("#808080")).toBe(true);
    expect(isGrayscale("#f5f5f5")).toBe(true); // heel lichtgrijs
  });

  it("herkent verzadigde merkkleuren niet als grijs", () => {
    expect(isGrayscale("#15803d")).toBe(false); // groen
    expect(isGrayscale("#e8a020")).toBe(false); // oranje
    expect(isGrayscale("#1a7f4b")).toBe(false);
  });
});

describe("contrastRatio / contrastAgainstWhite", () => {
  it("geeft 21 voor zwart-op-wit (maximaal contrast)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("geeft 1 voor identieke kleuren", () => {
    expect(contrastRatio("#15803d", "#15803d")).toBeCloseTo(1, 5);
  });

  it("is symmetrisch", () => {
    const a = contrastRatio("#15803d", "#ffffff");
    const b = contrastRatio("#ffffff", "#15803d");
    expect(a).toBeCloseTo(b!, 10);
  });

  it("geeft null bij ongeldige hex", () => {
    expect(contrastAgainstWhite("niet-een-kleur")).toBeNull();
  });
});

describe("darkenUntilContrast", () => {
  it("laat een al-donkere kleur ongewijzigd (voldoet al aan AA)", () => {
    const result = darkenUntilContrast("#15803d");
    expect(result).not.toBeNull();
    expect(result!.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("verdonkert een te lichte kleur tot WCAG AA (4.5:1) tegen wit", () => {
    const result = darkenUntilContrast("#ffe08a"); // lichtgeel, laag contrast
    expect(result).not.toBeNull();
    expect(result!.ratio).toBeGreaterThanOrEqual(4.5);
    // De verdonkerde kleur moet zelf ook een geldige hex zijn.
    expect(result!.hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("geeft null bij ongeldige hex", () => {
    expect(darkenUntilContrast("niet-een-kleur")).toBeNull();
  });
});

describe("colorsAreDistinct", () => {
  it("beschouwt complementaire kleuren als duidelijk verschillend", () => {
    expect(colorsAreDistinct("#15803d", "#e8a020")).toBe(true); // groen vs oranje
  });

  it("beschouwt bijna-identieke kleuren niet als verschillend", () => {
    expect(colorsAreDistinct("#15803d", "#16813e")).toBe(false);
  });

  it("beschouwt dezelfde hue met sterk ander lightness wél als verschillend", () => {
    expect(colorsAreDistinct("#0a3d1e", "#8fd9ac")).toBe(true); // donker- vs lichtgroen
  });
});

describe("hexToHsl", () => {
  it("geeft de verwachte hue voor primaire kleuren", () => {
    const red = hexToHsl("#ff0000")!;
    expect(red.h).toBeCloseTo(0, 0);
    const green = hexToHsl("#00ff00")!;
    expect(green.h).toBeCloseTo(120, 0);
    const blue = hexToHsl("#0000ff")!;
    expect(blue.h).toBeCloseTo(240, 0);
  });
});
