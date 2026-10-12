import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calculateBreakdown as oud } from "./legacy/calculate-oud";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { berekenPrijs } from "./engine";
import { BASIS_KOSTEN, optie, product } from "./test-helpers";

// De nieuwe kern geeft voor bestaande rekentools (vaste kosten per onderdeel) hetzelfde bedrag als de
// oude berekening, op afronding na: de nieuwe rondt elke regel op hele centen (en de btw per regel), de
// oude rekende met onafgeronde bedragen. Het verschil is dus maximaal een halve cent per regel.

const prijs = fc.double({ min: 0, max: 500, noNaN: true }).map((x) => Math.round(x * 100) / 100);
const hoeveelheid = fc.double({ min: 0.1, max: 400, noNaN: true }).map((x) => Math.round(x * 10) / 10);

const productArb = (i: number) =>
  fc.record({
    prijzen: fc.array(prijs, { minLength: 1, maxLength: 3 }),
    tempo: fc.oneof(fc.constant(null), fc.double({ min: 1, max: 40, noNaN: true }).map((x) => Math.round(x * 10) / 10)),
    stap: fc.oneof(fc.constant(null), fc.constant(1.8), fc.constant(2.5)),
    transport: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 200 })),
    meeschalend: fc.boolean(),
    perDag: fc.boolean(),
    voorrij: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
    voorrijMee: fc.boolean(),
    extraPrijs: fc.integer({ min: 0, max: 60 }),
    altijd: fc.boolean(),
  }).map((c) =>
    product({
      id: `p${i}`,
      productiviteit: c.tempo,
      transportkostenOverride: c.transport,
      transportMeeschalend: c.meeschalend,
      transportPerDag: c.perDag,
      voorrijkostenOverride: c.voorrij,
      voorrijMeeschalend: c.voorrijMee,
      materiaalCategorieen: c.prijzen.map((p, k) => ({ id: `p${i}-c${k}`, naam: `Cat ${k}`, materialen: [optie(`p${i}-c${k}-m`, `Mat ${k}`, p, { stapgrootte: k === 0 ? c.stap : null })] })),
      extraOpties: [{ id: `p${i}-e`, naam: "Extra", prijs: c.extraPrijs, type: "PER_EENHEID", altijd: c.altijd }],
    })
  );

describe("nieuwe kern tegenover de oude berekening", () => {
  it("wijkt hoogstens enkele centen af (afronding per regel)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat(1), { minLength: 1, maxLength: 1 }).chain(() => fc.tuple(productArb(0), productArb(1), productArb(2))),
        fc.tuple(hoeveelheid, hoeveelheid, hoeveelheid),
        fc.record({ afronden: fc.boolean(), eenheid: fc.constantFrom("UUR", "DAGDEEL", "DAG") as fc.Arbitrary<"UUR" | "DAGDEEL" | "DAG">, btw: fc.constantFrom(9, 21), transport: fc.integer({ min: 0, max: 150 }) }),
        (producten, qs, k) => {
          const kosten = { ...BASIS_KOSTEN, arbeidAfronden: k.afronden, arbeidStapEenheid: k.eenheid, btwPercentage: k.btw, transportTarief: k.transport };
          const hoeveelheden = Object.fromEntries(producten.map((p, i) => [p.id, qs[i]]));
          const materialSelections: Record<string, string> = {};
          for (const p of producten) for (const c of p.materiaalCategorieen) materialSelections[c.id] = c.materialen[0].id;
          const extraSelections = Object.fromEntries(producten.map((p) => [p.extraOpties[0].id, 1]));
          const o = oud({ products: producten, productQty: hoeveelheden, materialSelections, extraSelections, costSettings: kosten });
          const n = berekenPrijs(configVanProducten(producten, kosten), invoerVanKlant({ producten, hoeveelheden, materiaalKeuzes: materialSelections, extraKeuzes: extraSelections }));
          const regels = n.regels.length;
          const marge = (regels * 1.5) / 100 + 0.02; // halve cent per regel voor de regel zelf en voor de btw
          expect(Math.abs(n.subtotaalExclCenten / 100 - o.subtotaal)).toBeLessThanOrEqual(marge);
          expect(Math.abs(n.totaalInclCenten / 100 - o.totaal)).toBeLessThanOrEqual(marge * 1.3);
        }
      ),
      { numRuns: 400 }
    );
  });
});
