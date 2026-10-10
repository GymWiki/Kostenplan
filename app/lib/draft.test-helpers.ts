import type { Draft } from "./draft";

// Een geldige draft voor tests.
export function testDraft(patch: Partial<Draft> = {}): Draft {
  return {
    version: 1,
    id: "draft-1",
    updatedAt: Date.now(),
    company: { name: "Hovenier De Vries", colors: { primair: "#15803d" } },
    tarieven: { tarief: 180, voorrijkosten: 35, transport: 0 },
    calculator: {
      name: "Mijn rekentool",
      werkzaamheden: [
        {
          id: "w1",
          actief: true,
          icoon: "Fence",
          presetId: "schutting",
          draft: {
            naam: "Schutting",
            methode: "METER",
            productiviteit: "6",
            transportPerDag: false,
            bandbreedte: false,
            werktempoPerMateriaal: false,
            materialen: [{ sleutel: "m1", naam: "Douglas", prijs: "85", prijsMin: "85", prijsMax: "85", productiviteitOverride: "", isVoorbeeld: true }],
            extras: [],
          },
        },
      ],
    },
    ...patch,
  };
}
