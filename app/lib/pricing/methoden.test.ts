import { describe, expect, it } from "vitest";
import { berekenPrijs } from "./engine";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { BASIS_KOSTEN, optie, product, type TestProduct } from "./test-helpers";
import type { CalcCostSettings } from "@/app/lib/calculate";

// Elke rekenmethode (per meter, per m², lengte × breedte, per stuk) met alle onderdelen van de berekening.
// De verwachte bedragen worden hier los van de kern uitgerekend (in centen, per regel afgerond).

const methoden = [
  { naam: "per meter", eenheid: "m1", sjabloon: "ENKELE_HOEVEELHEID" as const, hoeveelheid: 18, invoer: (p: TestProduct) => ({ hoeveelheden: { [p.id]: 18 } }), qty: 18 },
  { naam: "per m²", eenheid: "m2", sjabloon: "ENKELE_HOEVEELHEID" as const, hoeveelheid: 42.5, invoer: (p: TestProduct) => ({ hoeveelheden: { [p.id]: 42.5 } }), qty: 42.5 },
  { naam: "lengte × breedte", eenheid: "m2", sjabloon: "AFMETINGEN" as const, hoeveelheid: 7.5 * 3.2, invoer: (p: TestProduct) => ({ sjabloonInvoer: { [p.id]: { lengte: 7.5, breedte: 3.2 } } }), qty: 7.5 * 3.2 },
  { naam: "per stuk", eenheid: "stuks", sjabloon: "ENKELE_HOEVEELHEID" as const, hoeveelheid: 5, invoer: (p: TestProduct) => ({ hoeveelheden: { [p.id]: 5 } }), qty: 5 },
];

const r = (x: number) => Math.round(Math.round(x * 1e6) / 1e6);
const btw = (c: number, pct: number) => r((c * pct) / 100);

describe.each(methoden)("rekenmethode $naam", (m) => {
  const maak = (extra: Partial<TestProduct> = {}) =>
    product({
      id: "x",
      eenheid: m.eenheid,
      sjabloon: m.sjabloon,
      sjabloonConfig: { metDiepte: false },
      productiviteit: 6,
      materiaalCategorieen: [
        { id: "hoofd", naam: "Hoofdmateriaal", materialen: [optie("a", "A", 31.25, { productiviteitOverride: 4 }), optie("b", "B", 44)] },
        { id: "bij", naam: "Bijmateriaal", materialen: [optie("z", "Z", 6.4, { stapgrootte: 2 })] },
      ],
      extraOpties: [
        { id: "ja", naam: "Afvoer", prijs: 3.5, type: "PER_EENHEID" },
        { id: "st", naam: "Lamp", prijs: 52, type: "PER_STUK" },
      ],
      ...extra,
    });
  const kosten = (k: Partial<CalcCostSettings> = {}): CalcCostSettings => ({ ...BASIS_KOSTEN, arbeidTariefDagdeel: 190, transportTarief: 60, voorrijTarief: 40, ...k });
  const rekenen = (p: TestProduct, k: CalcCostSettings, extra: { materiaalKeuzes?: Record<string, string>; extraKeuzes?: Record<string, number> } = {}, opties = {}) =>
    berekenPrijs(configVanProducten([p], k, opties), invoerVanKlant({ producten: [p], ...m.invoer(p), ...extra }));

  it("telt alle materiaalcategorieën, werktempo per materiaal, extra's, transport en voorrijkosten", () => {
    const p = maak();
    const res = rekenen(p, kosten(), { materiaalKeuzes: { hoofd: "a" }, extraKeuzes: { ja: 1, st: 2 } });
    const q = m.qty;
    const verwacht = [
      r(q * 3125), // hoofdmateriaal A
      r(Math.ceil(Math.round((q / 2) * 1e6) / 1e6) * 2 * 640), // bijmateriaal in stappen van 2
      r(q * 350), // afvoer per eenheid
      r(2 * 5200), // twee lampen
      r((q / 4) * 19000), // arbeid met werktempo van A
      6000, // transport
      4000, // voorrijkosten
    ];
    expect(res.regels.map((x) => x.bedragExclCenten)).toEqual(verwacht);
    expect(res.subtotaalExclCenten).toBe(verwacht.reduce((s, x) => s + x, 0));
    expect(res.btwCenten).toBe(verwacht.reduce((s, x) => s + btw(x, 21), 0));
  });

  it("gebruikt het werktempo van het onderdeel bij een ander materiaal", () => {
    const res = rekenen(maak(), kosten(), { materiaalKeuzes: { hoofd: "b" } });
    expect(res.regels.find((x) => x.soort === "arbeid")!.bedragExclCenten).toBe(r((m.qty / 6) * 19000));
  });

  it("transport vast, meeschalend en per dag", () => {
    const vast = rekenen(maak(), kosten(), { materiaalKeuzes: { hoofd: "b" } }).regels.find((x) => x.soort === "transport")!;
    const mee = rekenen(maak({ transportMeeschalend: true }), kosten(), { materiaalKeuzes: { hoofd: "b" } }).regels.find((x) => x.soort === "transport")!;
    const dag = rekenen(maak({ transportPerDag: true }), kosten(), { materiaalKeuzes: { hoofd: "b" } }).regels.find((x) => x.soort === "transport")!;
    expect(vast.bedragExclCenten).toBe(6000);
    expect(mee.bedragExclCenten).toBe(r(m.qty * 6000));
    expect(dag.aantal).toBe(Math.max(1, Math.ceil(Math.round(((m.qty / 6) / 2) * 1e6) / 1e6)));
    expect(dag.bedragExclCenten).toBe(dag.aantal * 6000);
  });

  it("btw 9% en 21% en KOR", () => {
    const p = maak();
    const k = { materiaalKeuzes: { hoofd: "b" } };
    const a = rekenen(p, kosten({ btwPercentage: 9 }), k);
    const b = rekenen(p, kosten({ btwPercentage: 21 }), k);
    const kor = rekenen(p, kosten({ btwPercentage: 21 }), k, { kor: true });
    expect(a.subtotaalExclCenten).toBe(b.subtotaalExclCenten);
    expect(a.btwCenten).toBe(a.regels.reduce((s, x) => s + btw(x.bedragExclCenten, 9), 0));
    expect(b.btwCenten).toBe(b.regels.reduce((s, x) => s + btw(x.bedragExclCenten, 21), 0));
    expect(kor.totaalInclCenten).toBe(kor.subtotaalExclCenten);
  });

  it("bandbreedte per product en over het totaal", () => {
    const p = maak({ materiaalCategorieen: [{ id: "hoofd", naam: "H", materialen: [optie("a", "A", 40, { prijsType: "BANDBREEDTE", prijsMin: 30, prijsMax: 50 })] }] });
    const per = rekenen(p, kosten({ bandbreedteModus: "PER_PRODUCT" }));
    expect(per.bandbreedte!.max.kosten.materiaal - per.bandbreedte!.min.kosten.materiaal).toBe(r(m.qty * 5000) - r(m.qty * 3000));
    const totaal = rekenen(p, kosten({ bandbreedteModus: "TOTAAL", bandbreedteMargeOmlaag: 5, bandbreedteMargeOmhoog: 12 }));
    expect(totaal.bandbreedte!.min.totaalInclCenten).toBe(r(totaal.totaalInclCenten * 0.95));
    expect(totaal.bandbreedte!.max.totaalInclCenten).toBe(r(totaal.totaalInclCenten * 1.12));
  });

  it("meerdere onderdelen in één aanvraag: elk onderdeel, en vaste kosten één keer als dat zo staat", () => {
    const a = maak();
    const b = maak({ id: "y", materiaalCategorieen: [{ id: "y-cat", naam: "M", materialen: [optie("m", "M", 20)] }] });
    const producten = [a, b];
    const inv = { ...invoerVanKlant({ producten: [a], ...m.invoer(a) }).onderdelen, ...invoerVanKlant({ producten: [b], ...m.invoer(b) }).onderdelen };
    const perOnderdeel = berekenPrijs(configVanProducten(producten, kosten()), { onderdelen: inv });
    const perAanvraag = berekenPrijs(configVanProducten(producten, kosten(), { vasteKosten: "PER_AANVRAAG" }), { onderdelen: inv });
    expect(perOnderdeel.onderdelen).toHaveLength(2);
    expect(perOnderdeel.regels.filter((x) => x.soort === "voorrijkosten")).toHaveLength(2);
    expect(perAanvraag.regels.filter((x) => x.soort === "voorrijkosten")).toHaveLength(1);
    expect(perOnderdeel.subtotaalExclCenten - perAanvraag.subtotaalExclCenten).toBe(4000 + 6000);
  });
});
