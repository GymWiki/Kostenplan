import fc from "fast-check";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { BASIS_KOSTEN, optie, product, type TestProduct } from "./test-helpers";
import type { CalcCostSettings } from "@/app/lib/calculate";

// Willekeurige rekentools en invoer voor de eigenschapstests (fast-check). Alleen voor tests.
export const prijs = fc.double({ min: 0, max: 400, noNaN: true }).map((x) => Math.round(x * 1000) / 1000);
const getal = fc.double({ min: 0, max: 500, noNaN: true }).map((x) => Math.round(x * 10) / 10);

const methodeArb = fc.constantFrom("METER", "M2", "LENGTE_BREEDTE", "STUK");

export const onderdeelArb = (i: number) =>
  fc
    .record({
      methode: methodeArb,
      tempo: fc.oneof(fc.constant(null), fc.double({ min: 0.5, max: 40, noNaN: true }).map((x) => Math.round(x * 10) / 10)),
      prijzen: fc.array(prijs, { minLength: 1, maxLength: 3 }),
      stap: fc.oneof(fc.constant(null), fc.constantFrom(1.8, 2, 2.5)),
      override: fc.oneof(fc.constant(null), fc.double({ min: 0.5, max: 30, noNaN: true }).map((x) => Math.round(x * 10) / 10)),
      transport: fc.constantFrom("vast", "mee", "dag"),
      voorrijMee: fc.boolean(),
      extra: prijs,
      altijd: fc.boolean(),
    })
    .map((c) =>
      product({
        id: `o${i}`,
        eenheid: c.methode === "METER" ? "m1" : c.methode === "STUK" ? "stuks" : "m2",
        sjabloon: c.methode === "LENGTE_BREEDTE" ? "AFMETINGEN" : "ENKELE_HOEVEELHEID",
        sjabloonConfig: { metDiepte: false },
        productiviteit: c.tempo,
        transportMeeschalend: c.transport === "mee",
        transportPerDag: c.transport === "dag",
        voorrijMeeschalend: c.voorrijMee,
        materiaalCategorieen: c.prijzen.map((p, k) => ({
          id: `o${i}-c${k}`,
          naam: `Cat ${k}`,
          materialen: [optie(`o${i}-c${k}-m`, "M", p, { stapgrootte: k === 0 ? c.stap : null, productiviteitOverride: k === 0 ? c.override : null })],
        })),
        extraOpties: [{ id: `o${i}-e`, naam: "Extra", prijs: c.extra, type: "PER_EENHEID", altijd: c.altijd }],
      })
    );

export const kostenArb: fc.Arbitrary<CalcCostSettings> = fc.record({
  arbeidAfronden: fc.boolean(),
  arbeidStapEenheid: fc.constantFrom("UUR", "DAGDEEL", "DAG") as fc.Arbitrary<"UUR" | "DAGDEEL" | "DAG">,
  btwPercentage: fc.constantFrom(0, 9, 21),
  transportTarief: fc.integer({ min: 0, max: 200 }),
  voorrijTarief: fc.integer({ min: 0, max: 100 }),
  bandbreedteModus: fc.constantFrom("GEEN", "TOTAAL") as fc.Arbitrary<"GEEN" | "TOTAAL">,
}).map((r) => ({ ...BASIS_KOSTEN, ...r }));

export function invoerVoor(producten: TestProduct[], q: number[]) {
  const hoeveelheden: Record<string, number> = {};
  const sjabloonInvoer: Record<string, Record<string, unknown>> = {};
  producten.forEach((p, i) => {
    if (p.sjabloon === "AFMETINGEN") sjabloonInvoer[p.id] = { lengte: q[i], breedte: 3 };
    else hoeveelheden[p.id] = q[i];
  });
  return invoerVanKlant({ producten, hoeveelheden, sjabloonInvoer });
}

export const scenario = fc.tuple(onderdeelArb(0), onderdeelArb(1)).chain(([a, b]) => fc.tuple(fc.constant<TestProduct[]>([a, b]), kostenArb, fc.tuple(getal, getal), fc.constantFrom<"PER_ONDERDEEL" | "PER_AANVRAAG">("PER_ONDERDEEL", "PER_AANVRAAG"), fc.boolean()));

