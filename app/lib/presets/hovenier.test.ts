import { describe, expect, it } from "vitest";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { isKnownUnit } from "@/app/lib/units";
import { HOVENIER_PRESETS } from "./hovenier";
import { presetById, productiviteitVoorStapEenheid, REKENMETHODE_SJABLOON } from "./index";

describe("hovenier-presets", () => {
  it("bevat de 8 afgesproken werkzaamheden met unieke ids", () => {
    expect(HOVENIER_PRESETS).toHaveLength(8);
    expect(new Set(HOVENIER_PRESETS.map((p) => p.id)).size).toBe(8);
  });

  it.each(HOVENIER_PRESETS)("$id is compleet en geldig", (p) => {
    expect(p.naam.trim()).not.toBe("");
    expect(PRODUCT_ICONS[p.icoon]).toBeDefined();
    expect(isKnownUnit(p.eenheid)).toBe(true);
    expect(REKENMETHODE_SJABLOON[p.rekenmethode]).toBeDefined();
    expect(p.materialen.length).toBeGreaterThanOrEqual(2);
    expect(p.materialen.length).toBeLessThanOrEqual(4);
    for (const m of p.materialen) {
      expect(m.naam.trim()).not.toBe("");
      expect(m.prijs).toBeGreaterThan(0);
    }
    expect(p.productiviteitPerDag).toBeGreaterThan(0);
    expect(p.voorbeeldHoeveelheid).toBeGreaterThan(0);
    expect(p.uitleg.length).toBeGreaterThan(0);
    expect(p.productiviteitVraag.endsWith("?")).toBe(true);
  });

  it("rekent productiviteit om naar de gekozen arbeidseenheid", () => {
    const p = presetById("bestrating")!;
    expect(productiviteitVoorStapEenheid(p, "DAG")).toBe(20);
    expect(productiviteitVoorStapEenheid(p, "DAGDEEL")).toBe(10);
    expect(productiviteitVoorStapEenheid(p, "UUR")).toBe(2.5);
  });
});
