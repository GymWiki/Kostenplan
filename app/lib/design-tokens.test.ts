import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Contrastbewaking voor de design tokens in globals.css (admin-thema):
// gedempte tekst >= 4.5:1 (WCAG AA), invoerrand >= 3:1 (WCAG 1.4.11).
const css = readFileSync("app/globals.css", "utf8");

function blok(selector: string): Record<string, [number, number, number]> {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `blok ${selector}`).toBeGreaterThan(-1);
  const eind = css.indexOf("\n}", start);
  const tekst = css.slice(start, eind);
  const tokens: Record<string, [number, number, number]> = {};
  for (const m of tekst.matchAll(/--([a-z-]+):\s*hsl\((\d+) (\d+)% (\d+)%\)/g)) {
    tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return tokens;
}

function luminantie([h, s, l]: [number, number, number]) {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hoog, laag] = [luminantie(a), luminantie(b)].sort((x, y) => y - x);
  return (hoog + 0.05) / (laag + 0.05);
}

describe.each([
  ["licht", "[data-admin-theme]"],
  ["donker", ".dark [data-admin-theme]"],
])("admin-tokens (%s)", (_naam, selector) => {
  const t = blok(selector);

  it("tekst haalt AA op alle vlakken", () => {
    for (const vlak of ["background", "card", "secondary", "muted"]) {
      expect(contrast(t["foreground"], t[vlak]), `foreground op ${vlak}`).toBeGreaterThanOrEqual(7);
      expect(contrast(t["muted-foreground"], t[vlak]), `muted-foreground op ${vlak}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("invoerrand is minstens 3:1 tegen kaart en achtergrond", () => {
    expect(contrast(t["input"], t["card"])).toBeGreaterThanOrEqual(3);
    expect(contrast(t["input"], t["background"])).toBeGreaterThanOrEqual(3);
  });

  it("invoerrand is duidelijk donkerder dan de gewone rand", () => {
    expect(contrast(t["input"], t["card"])).toBeGreaterThan(contrast(t["border"], t["card"]) * 1.8);
  });

  it("primair, waarschuwing en voorbeeldlabel zijn leesbaar", () => {
    expect(contrast(t["primary-foreground"], t["primary"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["warning"], t["card"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["example-foreground"], t["example"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["destructive"], t["card"])).toBeGreaterThanOrEqual(4.5);
  });
});
