import { describe, expect, it } from "vitest";
import { kostenRijen } from "./lead-kosten";
import type { LeadSnapshot } from "./leads";

const basis = { regels: [], arbeidskosten: 33.75, materiaalkosten: 1170.92, transportkosten: 0, voorrijkosten: 35, subtotaal: 1239.67, btw: 260.33, totaal: 1500 } as LeadSnapshot;

describe("kostenRijen", () => {
  it("een minimumaanvulling is een eigen rij en de rijen tellen op tot het subtotaal (Boom C)", () => {
    const snapshot = { ...basis, rekenkern: { resultaat: { kosten: { arbeid: 3375, materiaal: 36000, extra: 0, artikel: 0, transport: 0, voorrijkosten: 3500, afstand: 0, minimum: 81092 } } } } as unknown as LeadSnapshot;
    const rijen = kostenRijen(snapshot);
    expect(rijen.find((r) => r.label === "Aanvulling tot minimumtarief")?.waarde).toBe(810.92);
    expect(rijen.find((r) => r.label === "Materiaalkosten")?.waarde).toBe(360);
    expect(Math.round(rijen.reduce((s, r) => s + r.waarde, 0) * 100)).toBe(123967);
  });
  it("oudere snapshots tonen de vier totalen", () => {
    expect(kostenRijen(basis).map((r) => r.label)).toEqual(["Arbeidskosten", "Materiaalkosten", "Transportkosten", "Voorrijkosten"]);
  });
});
