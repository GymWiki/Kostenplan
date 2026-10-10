import { describe, expect, it } from "vitest";
import { maakDraftOpslag, type OpslagLike } from "./draft-opslag";
import { DRAFT_SLEUTEL, DRAFT_MAX_LEEFTIJD_MS, type Draft } from "./draft";
import { testDraft } from "./draft.test-helpers";

function fakeOpslag(opties: { maxTekens?: number } = {}): OpslagLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (opties.maxTekens && v.length > opties.maxTekens) throw new DOMException("vol", "QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
}

describe("draft-opslag", () => {
  it("schrijft en leest terug", () => {
    const o = fakeOpslag();
    const s = maakDraftOpslag(() => o);
    expect(s.schrijf(testDraft()).soort).toBe("ok");
    expect(s.lees().draft?.company.name).toBe("Hovenier De Vries");
  });

  it("negeert en verwijdert een draft ouder dan 30 dagen", () => {
    const o = fakeOpslag();
    const oud = testDraft({ updatedAt: 1000 });
    o.setItem(DRAFT_SLEUTEL, JSON.stringify(oud));
    const s = maakDraftOpslag(() => o, () => 1000 + DRAFT_MAX_LEEFTIJD_MS + 1);
    expect(s.lees().draft).toBeNull();
    expect(o.data.has(DRAFT_SLEUTEL)).toBe(false);
  });

  it("ruimt ongeldige of kapotte data op", () => {
    const o = fakeOpslag();
    o.setItem(DRAFT_SLEUTEL, "{kapot");
    const s = maakDraftOpslag(() => o);
    expect(s.lees().draft).toBeNull();
    o.setItem(DRAFT_SLEUTEL, JSON.stringify({ version: 1 }));
    expect(s.lees().draft).toBeNull();
    expect(o.data.has(DRAFT_SLEUTEL)).toBe(false);
  });

  it("valt terug op geheugen als opslag geblokkeerd is", () => {
    const s = maakDraftOpslag(() => {
      throw new DOMException("geblokkeerd", "SecurityError");
    });
    expect(s.schrijf(testDraft()).soort).toBe("geheugen");
    const l = s.lees();
    expect(l.opslag).toBe("geheugen");
    expect(l.draft?.calculator.name).toBe("Mijn rekentool");
  });

  it("laat het logo weg bij een quotumfout en meldt dat", () => {
    const o = fakeOpslag({ maxTekens: 3000 });
    const s = maakDraftOpslag(() => o);
    const d: Draft = testDraft();
    d.company.logoDataUrl = "data:image/png;base64," + "A".repeat(5000);
    expect(s.schrijf(d).soort).toBe("logo-weggelaten");
    expect(s.lees().draft?.company.logoDataUrl).toBeUndefined();
  });
});
