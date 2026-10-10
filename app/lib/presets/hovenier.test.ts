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

describe("wizard-hulpfuncties", () => {
  it("past de productiviteitsvraag aan op de arbeidseenheid", async () => {
    const { productiviteitVraagVoor } = await import("./index");
    const p = presetById("bestrating")!;
    expect(productiviteitVraagVoor(p, "DAG")).toBe("Hoeveel m² leg je per dag?");
    expect(productiviteitVraagVoor(p, "DAGDEEL")).toBe("Hoeveel m² leg je per dagdeel?");
    expect(productiviteitVraagVoor(p, "UUR")).toBe("Hoeveel m² leg je per uur?");
  });

  it("herkent ongewijzigde basistarieven", async () => {
    const { zijnBasisTarievenNogDefault, BASIS_TARIEVEN_DEFAULTS: d } = await import("./basis-tarieven");
    const company = { standaardArbeidTariefUur: 45, standaardVoorrijTarief: 35 };
    const cs = { arbeidStapEenheid: "UUR", ...d };
    expect(zijnBasisTarievenNogDefault(cs, company)).toBe(true);
    expect(zijnBasisTarievenNogDefault({ ...cs, arbeidStapEenheid: "DAG" }, company)).toBe(false);
    expect(zijnBasisTarievenNogDefault({ ...cs, transportTarief: 50 }, company)).toBe(false);
  });
});

describe("startpakket en productlimiet", () => {
  it("maakt de eerste N aan en geeft de rest als upgrade-suggestie", async () => {
    const { verdeelOverRuimte } = await import("./index");
    expect(verdeelOverRuimte(["a", "b", "c"], 2)).toEqual({ aanmaken: ["a", "b"], over: ["c"] });
    expect(verdeelOverRuimte(["a", "b"], 10)).toEqual({ aanmaken: ["a", "b"], over: [] });
    expect(verdeelOverRuimte(["a", "b"], 0)).toEqual({ aanmaken: [], over: ["a", "b"] });
    expect(verdeelOverRuimte(["a", "b"], -3)).toEqual({ aanmaken: [], over: ["a", "b"] });
    expect(verdeelOverRuimte(["a", "b"], null)).toEqual({ aanmaken: ["a", "b"], over: [] });
  });

  it("past alle presets binnen de gratis productlimiet", async () => {
    const { GRATIS_CATALOGUS_LIMIET } = await import("@/app/lib/subscription");
    expect(HOVENIER_PRESETS.length).toBeLessThanOrEqual(GRATIS_CATALOGUS_LIMIET);
  });
});
