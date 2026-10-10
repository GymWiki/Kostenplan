import { describe, expect, it } from "vitest";
import { draftNaarKosten, draftNaarProducten, maakDraft } from "./draft-editor";
import { draftSchema } from "./draft";
import { calculateBreakdown } from "./calculate";

describe("maakDraft + draftNaarProducten", () => {
  const d = maakDraft({ presetIds: ["bestrating", "schutting"], tarief: 200 });

  it("maakt een geldig concept met voorbeeldprijzen", () => {
    expect(draftSchema.safeParse(JSON.parse(JSON.stringify(d))).success).toBe(true);
    expect(d.calculator.werkzaamheden).toHaveLength(2);
    expect(d.calculator.werkzaamheden[0].draft.materialen.every((m) => m.isVoorbeeld)).toBe(true);
  });

  it("geeft elk onderdeel en materiaal een eigen id", () => {
    const p = draftNaarProducten(d);
    const mats = p.flatMap((x) => x.materiaalCategorieen.flatMap((c) => c.materialen.map((m) => m.id)));
    expect(new Set(mats).size).toBe(mats.length);
    expect(new Set(p.map((x) => x.id)).size).toBe(2);
    expect(new Set(p.map((x) => x.materiaalCategorieen[0].id)).size).toBe(2);
  });

  it("rekent in de browser met de gewone rekenlogica", () => {
    const [p] = draftNaarProducten(d);
    const kosten = draftNaarKosten(d);
    const r = calculateBreakdown({
      products: [p],
      productQty: { [p.id]: 20 },
      materialSelections: { [p.materiaalCategorieen[0].id]: p.materiaalCategorieen[0].materialen[0].id },
      extraSelections: {},
      costSettings: kosten,
    });
    expect(r.totaal).toBeGreaterThan(0);
  });
});
