import { describe, expect, it } from "vitest";
import { bouwOfferteUitLead } from "./uit-lead";
import { berekenTotalen } from "./bereken";
import type { LeadSnapshot } from "@/app/lib/leads";
import { calculateBreakdownRange, type CalcCostSettings } from "@/app/lib/calculate";
import { bouwLeadSnapshot, type SnapshotProduct } from "@/app/lib/lead-snapshot";
import type { OfferteInhoud } from "./model";

// Regressie €0-regel: een lead wordt omgezet naar een offerte met per onderdeel
// een sectie en losse regels (materiaal, arbeid, transport, voorrijkosten,
// extra's) met de échte prijs per eenheid. Nooit een bedragregel op €0 en nooit
// één samengevoegde regel "Materiaal- en overige kosten".
const snapshotMetOpbouw: LeadSnapshot = {
  regels: [
    {
      naam: "Schutting",
      type: "product",
      aantal: 20,
      eenheid: "m1",
      materiaal: "Douglas",
      prijs: 2400,
      opbouw: {
        materiaal: [{ naam: "Douglas schutting", hoeveelheid: 20, eenheid: "m1", prijsPerEenheid: 85, bedrag: 1700 }],
        arbeid: { tijd: 8, eenheid: "uur", tarief: 55, bedrag: 440 },
        transport: { bedrag: 60, meeschalend: false },
        voorrijkosten: { bedrag: 35, meeschalend: false },
        extras: [{ naam: "Extra sterke scharnieren", aantal: 1, bedrag: 165 }],
      },
    },
  ],
  arbeidskosten: 440,
  materiaalkosten: 1865,
  transportkosten: 60,
  voorrijkosten: 35,
  subtotaal: 2500,
  btw: 525,
  totaal: 3025,
};

describe("bouwOfferteUitLead (regressie €0-regel)", () => {
  it("maakt losse regels met echte prijzen en nooit een restpost", () => {
    const o = bouwOfferteUitLead(snapshotMetOpbouw);
    const regels = o.secties.flatMap((s) => s.regels);
    // Eén sectie voor het onderdeel + één voor voorrijkosten en transport (één keer per offerte).
    expect(o.secties).toHaveLength(2);
    expect(o.secties[0].titel).toMatch(/Schutting/);
    expect(o.secties[1].titel).toBe("Voorrijkosten en transport");
    expect(regels.some((r) => /Materiaal- en overige kosten/.test(r.omschrijving))).toBe(false);
    expect(regels.filter((r) => r.type !== "tekst").every((r) => r.prijsCenten > 0)).toBe(true);
    const materiaal = regels.find((r) => /Douglas/.test(r.omschrijving))!;
    expect(materiaal.aantal).toBe(20);
    expect(materiaal.prijsCenten).toBe(8500);
    const arbeid = regels.find((r) => r.omschrijving === "Arbeid")!;
    expect(arbeid).toMatchObject({ aantal: 8, eenheid: "uur", prijsCenten: 5500 });
  });

  it("valt voor oude snapshots zonder opbouw terug op één echte regel per onderdeel (geen €0)", () => {
    const oud: LeadSnapshot = { ...snapshotMetOpbouw, regels: [{ naam: "Terras", type: "product", aantal: 90, eenheid: "m2", prijs: 3600 }], subtotaal: 3600 };
    const regels = bouwOfferteUitLead(oud).secties.flatMap((s) => s.regels);
    expect(regels).toHaveLength(1);
    expect(regels[0].prijsCenten).toBe(4000);
  });

  it("schat de prijs (met waarschuwing) als een regel geen prijs heeft, nooit €0", () => {
    const zonderPrijs: LeadSnapshot = { ...snapshotMetOpbouw, regels: [{ naam: "Terras", type: "product", aantal: 10, eenheid: "m2" }], subtotaal: 1000, btw: 210, totaal: 1210 };
    const o = bouwOfferteUitLead(zonderPrijs);
    expect(o.secties.flatMap((s) => s.regels)[0].prijsCenten).toBe(10000);
    expect(o.waarschuwingen.join(" ")).toMatch(/schatting/);
  });
});

// ── Het offertetotaal is gelijk aan het totaal dat de klant in de rekentool zag ──

const kosten: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTariefUur: 55,
  arbeidTariefDagdeel: 180,
  arbeidTariefDag: 340,
  arbeidAfronden: false,
  transportEnabled: true,
  transportTarief: 60,
  voorrijEnabled: true,
  voorrijTarief: 35,
  materiaalEnabled: true,
  btwPercentage: 21,
  bandbreedteModus: "GEEN",
  bandbreedteMargeOmlaag: 0,
  bandbreedteMargeOmhoog: 0,
};

type P = SnapshotProduct;
const product = (o: Partial<P> & Pick<P, "id" | "naam" | "eenheid">): P => ({
  productiviteit: 10,
  arbeidTariefOverride: null,
  transportkostenOverride: null,
  transportMeeschalend: false,
  voorrijkostenOverride: null,
  voorrijMeeschalend: false,
  materiaalCategorieen: [],
  extraOpties: [],
  ...o,
});
const optie = (id: string, naam: string, prijs: number, extra: Partial<P["materiaalCategorieen"][number]["materialen"][number]> = {}) => ({ id, naam, prijs, prijsType: "VAST" as const, prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null, ...extra });

function offerteTotaal(products: P[], qty: Record<string, number>, sel: Record<string, string> = {}, extras: Record<string, number> = {}, k: CalcCostSettings = kosten, regelsBedrag: Record<string, number> = {}) {
  const breakdown = calculateBreakdownRange({ products, productQty: qty, productRegelsBedrag: regelsBedrag, materialSelections: sel, extraSelections: extras, costSettings: k });
  const snapshot = bouwLeadSnapshot({ products, productQty: qty, productRegelsBedrag: regelsBedrag, materialSelections: sel, extraSelections: extras, breakdown, btwPercentage: k.btwPercentage });
  const o = bouwOfferteUitLead(snapshot);
  const inhoud = { secties: o.secties, klant: { type: "particulier" }, afzender: { korActief: false } } as Pick<OfferteInhoud, "secties" | "klant" | "afzender">;
  const t = berekenTotalen(inhoud);
  const regels = o.secties.flatMap((s) => s.regels);
  return { t, o, rekentool: o.totaalRekentoolInclCenten, regels };
}

describe("offertetotaal = totaal in de rekentool", () => {
  const cases: { naam: string; products: P[]; qty: Record<string, number>; sel?: Record<string, string>; extras?: Record<string, number> }[] = [
    {
      naam: "per meter (schutting), één materiaalcategorie",
      products: [product({ id: "a", naam: "Schutting", eenheid: "m1", productiviteit: 8, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Douglas", 85.5)] }] })],
      qty: { a: 20 },
    },
    {
      naam: "per m² (bestrating) met twee materiaalcategorieën en stapgrootte",
      products: [
        product({
          id: "b",
          naam: "Bestrating",
          eenheid: "m2",
          productiviteit: 7,
          materiaalCategorieen: [
            { id: "c1", naam: "Tegel", materialen: [optie("t1", "Klinker", 48.75), optie("t2", "Betontegel", 32)] },
            { id: "c2", naam: "Zand", materialen: [optie("z1", "Straatzand", 6.4, { stapgrootte: 2 })] },
          ],
        }),
      ],
      qty: { b: 37.5 },
      sel: { c1: "t1" },
    },
    {
      naam: "lengte × breedte (gazon) met extra's per eenheid en per stuk, transport meeschalend",
      products: [
        product({
          id: "g",
          naam: "Graszoden",
          eenheid: "m2",
          productiviteit: 25,
          transportMeeschalend: true,
          materiaalCategorieen: [{ id: "c1", naam: "Zoden", materialen: [optie("g1", "Sportgazon", 9.5)] }],
          extraOpties: [
            { id: "e1", naam: "Bemesting", prijs: 1.25, type: "PER_EENHEID" },
            { id: "e2", naam: "Beregeningsset", prijs: 49.9, type: "PER_STUK" },
          ],
        }),
      ],
      qty: { g: 6 * 4.5 },
      extras: { e1: 1, e2: 2 },
    },
    {
      naam: "per stuk (lantaarn plaatsen) met toeslag en eigen arbeidstarief",
      products: [
        product({
          id: "p",
          naam: "Lantaarn plaatsen",
          eenheid: "stuks",
          productiviteit: 1.5,
          arbeidTariefOverride: 150,
          voorrijkostenOverride: 25,
          materiaalCategorieen: [{ id: "c1", naam: "Boom", materialen: [optie("b1", "Linde", 189), optie("b2", "Els", 140)] }],
          extraOpties: [{ id: "t1", naam: "Afvoer", prijs: 45, altijd: true, type: "PER_STUK" }],
        }),
      ],
      qty: { p: 3 },
      sel: { c1: "b1" },
    },
    {
      naam: "meerdere onderdelen: voorrijkosten en transport",
      products: [
        product({ id: "a", naam: "Schutting", eenheid: "m1", productiviteit: 8, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Douglas", 85)] }] }),
        product({ id: "b", naam: "Terras", eenheid: "m2", productiviteit: 6, materiaalCategorieen: [{ id: "c2", naam: "Tegel", materialen: [optie("t1", "Klinker", 45)] }] }),
      ],
      qty: { a: 14, b: 22 },
    },
  ];

  for (const c of cases) {
    it(c.naam, () => {
      const r = offerteTotaal(c.products, c.qty, c.sel, c.extras);
      expect(r.regels.length).toBeGreaterThan(1);
      expect(r.regels.every((x) => x.prijsCenten > 0)).toBe(true);
      expect(r.regels.some((x) => /Materiaal- en overige kosten/.test(x.omschrijving))).toBe(false);
      // Gelijk aan wat de klant zag (afrondingsverschil per regel hoogstens enkele centen).
      expect(Math.abs(r.t.totaalIncl - r.rekentool)).toBeLessThanOrEqual(5);
    });
  }

  it("levering van planten krijgt standaard 9% btw, arbeid 21% (configureerbaar)", () => {
    const p = product({ id: "h", naam: "Haag planten", eenheid: "m1", productiviteit: 12, materiaalCategorieen: [{ id: "c1", naam: "Planten", materialen: [optie("h1", "Beuk", 18)] }] });
    const r = offerteTotaal([p], { h: 10 });
    const beuk = r.regels.find((x) => /Beuk/.test(x.omschrijving))!;
    const arbeid = r.regels.find((x) => x.omschrijving === "Arbeid")!;
    expect(beuk.soort).toBe("planten");
    expect(beuk.btw).toBe(9);
    expect(arbeid.btw).toBe(21);
    expect(r.t.btwGroepen.map((g) => g.tarief)).toEqual([21, 9]);
    // Met een eigen instelling (bijv. 21% vanaf 2028) volgt de offerte die instelling.
    const p2 = bouwOfferteUitLead(
      bouwLeadSnapshot({ products: [p], productQty: { h: 10 }, productRegelsBedrag: {}, materialSelections: {}, extraSelections: {}, breakdown: calculateBreakdownRange({ products: [p], productQty: { h: 10 }, materialSelections: {}, extraSelections: {}, costSettings: kosten }), btwPercentage: 21 }),
      { btwStandaard: { planten: 21 } }
    );
    expect(p2.secties.flatMap((x) => x.regels).every((x) => x.btw === 21)).toBe(true);
  });

  it("arbeid afronden op hele dagdelen en transport per dag", () => {
    const k: CalcCostSettings = { ...kosten, arbeidAfronden: true };
    const p = product({ id: "a", naam: "Vlonder", eenheid: "m2", productiviteit: 3, transportPerDag: true, materiaalCategorieen: [{ id: "c1", naam: "Hout", materialen: [optie("m1", "Hardhout", 120)] }] });
    const r = offerteTotaal([p], { a: 10 }, {}, {}, k);
    expect(r.regels.find((x) => x.omschrijving === "Arbeid")!.aantal).toBe(4);
    expect(Math.abs(r.t.totaalIncl - r.rekentool)).toBeLessThanOrEqual(5);
  });

  it("bandbreedte: gebruikt het midden en meldt dit aan de hovenier", () => {
    const k: CalcCostSettings = { ...kosten, bandbreedteModus: "PER_PRODUCT" };
    const p = product({ id: "a", naam: "Terras", eenheid: "m2", productiviteit: 6, materiaalCategorieen: [{ id: "c1", naam: "Tegel", materialen: [optie("t1", "Klinker", 45, { prijsType: "BANDBREEDTE" as never, prijsMin: 40, prijsMax: 50 })] }] });
    const r = offerteTotaal([p], { a: 10 }, {}, {}, k);
    expect(r.o.bandbreedte).toBe(true);
    expect(r.o.waarschuwingen.join(" ")).toMatch(/midden/);
    expect(r.regels.find((x) => /Klinker/.test(x.omschrijving))!.prijsCenten).toBe(4500);
  });

  it("artikelregels (sjabloon ARTIKELREGELS) worden één echte regel", () => {
    const p = product({ id: "r", naam: "Verlichting", eenheid: "stuks", productiviteit: null });
    const r = offerteTotaal([p], { r: 4 }, {}, {}, kosten, { r: 520 });
    expect(r.regels.some((x) => /artikelen/.test(x.omschrijving) && x.prijsCenten * x.aantal === 52000)).toBe(true);
    expect(Math.abs(r.t.totaalIncl - r.rekentool)).toBeLessThanOrEqual(5);
  });
});
