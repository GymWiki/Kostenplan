import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { berekenPrijs } from "./engine";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { invoerVoor, scenario } from "./test-scenarios";

// Eigenschappen die voor elke invoer moeten gelden (fast-check).

describe("eigenschappen van de rekenkern", () => {
  it("het totaal is altijd de som van de regels, in hele centen en nooit negatief", () => {
    fc.assert(
      fc.property(scenario, ([producten, kosten, q, vast, kor]) => {
        const config = configVanProducten(producten, kosten, { vasteKosten: vast, kor });
        const r = berekenPrijs(config, invoerVoor(producten, [q[0], q[1]]));
        expect(r.regels.reduce((s, x) => s + x.bedragExclCenten, 0)).toBe(r.subtotaalExclCenten);
        expect(r.regels.reduce((s, x) => s + x.bedragInclCenten, 0)).toBe(r.totaalInclCenten);
        expect(r.regels.reduce((s, x) => s + x.btwCenten, 0)).toBe(r.btwCenten);
        expect(r.subtotaalExclCenten + r.btwCenten).toBe(r.totaalInclCenten);
        for (const x of r.regels) {
          expect(Number.isInteger(x.bedragExclCenten)).toBe(true);
          expect(x.bedragExclCenten).toBeGreaterThanOrEqual(0);
        }
        expect(Number.isInteger(r.totaalInclCenten)).toBe(true);
        expect(r.totaalInclCenten).toBeGreaterThanOrEqual(0);
        // de onderdelen en de projectregels vormen samen de regels
        const perOnderdeel = r.onderdelen.reduce((s, o) => s + o.subtotaalExclCenten, 0) + r.projectRegels.reduce((s, x) => s + x.bedragExclCenten, 0);
        expect(perOnderdeel).toBe(r.subtotaalExclCenten);
        if (kor) expect(r.btwCenten).toBe(0);
      }),
      { numRuns: 500 }
    );
  });

  it("meer hoeveelheid geeft nooit een lager totaal", () => {
    fc.assert(
      fc.property(scenario, ([producten, kosten, q, vast]) => {
        const config = configVanProducten(producten, { ...kosten, bandbreedteModus: "GEEN" }, { vasteKosten: vast });
        const [q0, q1] = q;
        const meer = (extra: number) => berekenPrijs(config, invoerVoor(producten, [q0 + extra, q1])).totaalInclCenten;
        const basis = meer(0);
        expect(meer(0.1)).toBeGreaterThanOrEqual(basis);
        expect(meer(7.3)).toBeGreaterThanOrEqual(meer(0.1));
      }),
      { numRuns: 400 }
    );
  });

  it("dezelfde invoer geeft altijd dezelfde uitkomst (en verandert de invoer niet)", () => {
    fc.assert(
      fc.property(scenario, ([producten, kosten, q, vast, kor]) => {
        const config = configVanProducten(producten, kosten, { vasteKosten: vast, kor });
        const invoer = invoerVoor(producten, [q[0], q[1]]);
        const kopie = JSON.stringify({ config, invoer });
        const a = berekenPrijs(config, invoer);
        const b = berekenPrijs(config, invoer);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        expect(JSON.stringify({ config, invoer })).toBe(kopie);
      }),
      { numRuns: 200 }
    );
  });

  it("de volgorde van de onderdelen in de invoer maakt niets uit", () => {
    fc.assert(
      fc.property(scenario, ([producten, kosten, q, vast]) => {
        const config = configVanProducten(producten, kosten, { vasteKosten: vast });
        const inv = invoerVoor(producten, [q[0], q[1]]);
        const omgekeerd = { onderdelen: Object.fromEntries(Object.entries(inv.onderdelen).reverse()) };
        expect(berekenPrijs(config, omgekeerd).totaalInclCenten).toBe(berekenPrijs(config, inv).totaalInclCenten);
      }),
      { numRuns: 200 }
    );
  });

  it("een kapotte invoer geeft nooit een kapotte prijs", () => {
    const rommel = fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity), fc.double({ min: -1e12, max: 1e12 }), fc.constant(1e300), fc.constant(-0), fc.constant("12" as unknown as number), fc.constant(null as unknown as number), fc.constant(undefined as unknown as number));
    fc.assert(
      fc.property(scenario, rommel, rommel, ([producten, kosten, , vast, kor], a, b) => {
        const config = configVanProducten(producten, kosten, { vasteKosten: vast, kor });
        const r = berekenPrijs(config, invoerVoor(producten, [a, b]));
        expect(Number.isInteger(r.totaalInclCenten)).toBe(true);
        expect(r.totaalInclCenten).toBeGreaterThanOrEqual(0);
        expect(r.regels.every((x) => Number.isInteger(x.bedragExclCenten) && x.bedragExclCenten >= 0)).toBe(true);
        expect(r.regels.reduce((s, x) => s + x.bedragInclCenten, 0)).toBe(r.totaalInclCenten);
      }),
      { numRuns: 400 }
    );
  });

  it("kapotte keuzes en extra's geven nooit een kapotte prijs", () => {
    fc.assert(
      fc.property(scenario, fc.string(), fc.oneof(fc.constant(NaN), fc.constant(-3), fc.constant(Infinity), fc.integer({ min: 0, max: 5 })), ([producten, kosten, q, vast], keuze, aantal) => {
        const config = configVanProducten(producten, kosten, { vasteKosten: vast });
        const invoer = invoerVanKlant({
          producten,
          hoeveelheden: Object.fromEntries(producten.filter((p) => p.sjabloon !== "AFMETINGEN").map((p, i) => [p.id, q[i] + 1])),
          sjabloonInvoer: Object.fromEntries(producten.filter((p) => p.sjabloon === "AFMETINGEN").map((p) => [p.id, { lengte: 4, breedte: 3 }])),
          materiaalKeuzes: Object.fromEntries(producten.flatMap((p) => p.materiaalCategorieen.map((c) => [c.id, keuze]))),
          extraKeuzes: Object.fromEntries(producten.flatMap((p) => p.extraOpties.map((e) => [e.id, aantal]))),
        });
        const r = berekenPrijs(config, invoer);
        expect(Number.isInteger(r.totaalInclCenten) && r.totaalInclCenten >= 0).toBe(true);
      }),
      { numRuns: 300 }
    );
  });
});
