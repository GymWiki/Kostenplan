import { describe, expect, it } from "vitest";
import { optie, product, reken } from "./test-helpers";

const soort = (r: ReturnType<typeof reken>, s: string) => r.regels.filter((x) => x.soort === s);

describe("rekenkern: basis", () => {
  it("rekent materiaal, arbeid, voorrijkosten en btw in centen", () => {
    const r = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } });
    // 20 × € 20 = 400; arbeid 20/10 = 2 dagdelen × € 200 = 400; voorrij 35.
    expect(r.regels.map((x) => [x.soort, x.bedragExclCenten])).toEqual([["materiaal", 40000], ["arbeid", 40000], ["voorrijkosten", 3500]]);
    expect(r.subtotaalExclCenten).toBe(83500);
    expect(r.btwCenten).toBe(17535);
    expect(r.totaalInclCenten).toBe(101035);
  });

  it("totaal is altijd de som van de regels, ook bij afronden per regel", () => {
    const r = reken([product({ id: "a", materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("m", "M", 3.333)] }] })], { hoeveelheden: { a: 7 } });
    const somIncl = r.regels.reduce((s, x) => s + x.bedragInclCenten, 0);
    expect(r.totaalInclCenten).toBe(somIncl);
    expect(r.subtotaalExclCenten).toBe(r.regels.reduce((s, x) => s + x.bedragExclCenten, 0));
  });

  it("slaat onderdelen zonder hoeveelheid over", () => {
    const r = reken([product({ id: "a" }), product({ id: "b" })], { hoeveelheden: { a: 0, b: 5 } });
    expect(r.onderdelen.map((o) => o.id)).toEqual(["b"]);
    expect(r.heeftSelectie).toBe(true);
    expect(reken([product({ id: "a" })], { hoeveelheden: { a: 0 } }).heeftSelectie).toBe(false);
  });
});

describe("rekenkern: materiaalcategorieën", () => {
  const terras = product({
    id: "t",
    materiaalCategorieen: [
      { id: "tegels", naam: "Tegels", materialen: [optie("beton", "Betontegel", 40), optie("natuur", "Natuursteen", 90)] },
      { id: "zand", naam: "Zand", materialen: [optie("straatzand", "Straatzand", 8)] },
    ],
  });

  it("maakt per categorie een eigen regel en telt ze allemaal mee", () => {
    const r = reken([terras], { hoeveelheden: { t: 20 }, materiaalKeuzes: { tegels: "beton" } });
    const m = soort(r, "materiaal");
    expect(m.map((x) => [x.categorie, x.omschrijving, x.aantal, x.prijsPerEenheidCenten, x.bedragExclCenten])).toEqual([
      ["Tegels", "Betontegel", 20, 4000, 80000],
      ["Zand", "Straatzand", 20, 800, 16000],
    ]);
  });

  it("een categorie met één optie telt automatisch mee, een categorie zonder keuze niet (met waarschuwing als verplicht)", () => {
    const verplicht = { ...terras, materiaalCategorieen: terras.materiaalCategorieen.map((c, i) => (i === 0 ? { ...c, verplicht: true } : c)) };
    const r = reken([verplicht], { hoeveelheden: { t: 10 } });
    expect(soort(r, "materiaal").map((x) => x.omschrijving)).toEqual(["Straatzand"]);
    expect(r.waarschuwingen.map((w) => w.code)).toContain("ontbrekende-keuze");
  });

  it("stapgrootte rondt de hoeveelheid van dat materiaal naar boven af", () => {
    const hek = product({ id: "h", eenheid: "m1", materiaalCategorieen: [{ id: "paal", naam: "Palen", materialen: [optie("p", "Paal", 12, { stapgrootte: 1.8 })] }] });
    const r = reken([hek], { hoeveelheden: { h: 4 } });
    const m = soort(r, "materiaal")[0];
    expect(m.aantal).toBeCloseTo(5.4, 6);
    expect(m.bedragExclCenten).toBe(6480);
  });

  it("werktempo per materiaal wint van het werktempo van het onderdeel (alleen eerste categorie)", () => {
    const p = product({
      id: "w",
      productiviteit: 10,
      materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("snel", "Snel", 10), optie("traag", "Traag", 10, { productiviteitOverride: 5 })] }],
    });
    const snel = reken([p], { hoeveelheden: { w: 20 }, materiaalKeuzes: { c: "snel" } });
    const traag = reken([p], { hoeveelheden: { w: 20 }, materiaalKeuzes: { c: "traag" } });
    expect(soort(snel, "arbeid")[0].aantal).toBe(2);
    expect(soort(traag, "arbeid")[0].aantal).toBe(4);
  });
});

describe("rekenkern: arbeid, transport en voorrijkosten", () => {
  it("rondt arbeid naar boven af op hele eenheden als dat aan staat", () => {
    const r = reken([product({ id: "a", productiviteit: 10 })], { hoeveelheden: { a: 12 } }, { arbeidAfronden: true });
    expect(soort(r, "arbeid")[0].aantal).toBe(2);
    expect(soort(r, "arbeid")[0].bedragExclCenten).toBe(40000);
    const continu = reken([product({ id: "a", productiviteit: 10 })], { hoeveelheden: { a: 12 } });
    expect(soort(continu, "arbeid")[0].aantal).toBeCloseTo(1.2, 9);
    expect(soort(continu, "arbeid")[0].bedragExclCenten).toBe(24000);
  });

  it("transport: vast, meeschalend en per dag", () => {
    const k = { transportTarief: 60 };
    expect(soort(reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, k), "transport")[0].bedragExclCenten).toBe(6000);
    expect(soort(reken([product({ id: "a", transportMeeschalend: true })], { hoeveelheden: { a: 20 } }, k), "transport")[0].bedragExclCenten).toBe(120000);
    // 20 m² / 10 = 2 dagdelen = 1 dag
    expect(soort(reken([product({ id: "a", transportPerDag: true })], { hoeveelheden: { a: 20 } }, k), "transport")[0].aantal).toBe(1);
    // 45 m² = 4,5 dagdelen = 2,25 dag → 3 begonnen dagen
    const dagen = soort(reken([product({ id: "a", transportPerDag: true })], { hoeveelheden: { a: 45 } }, k), "transport")[0];
    expect([dagen.aantal, dagen.bedragExclCenten]).toEqual([3, 18000]);
  });

  it("vaste kosten per onderdeel of één keer per aanvraag", () => {
    const twee = [product({ id: "a" }), product({ id: "b" })];
    const inv = { hoeveelheden: { a: 10, b: 10 } };
    const perOnderdeel = reken(twee, inv, { transportTarief: 60 });
    expect(soort(perOnderdeel, "voorrijkosten").map((x) => x.bedragExclCenten)).toEqual([3500, 3500]);
    const perAanvraag = reken(twee, inv, { transportTarief: 60 }, { vasteKosten: "PER_AANVRAAG" });
    expect(perAanvraag.projectRegels.map((x) => [x.soort, x.bedragExclCenten])).toEqual([["voorrijkosten", 3500], ["transport", 6000]]);
    expect(perAanvraag.totaalInclCenten).toBeLessThan(perOnderdeel.totaalInclCenten);
  });

  it("zet uitgeschakelde kostenblokken uit", () => {
    const r = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, { arbeidEnabled: false, voorrijEnabled: false });
    expect(r.regels.map((x) => x.soort)).toEqual(["materiaal"]);
    const geenMateriaal = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, { materiaalEnabled: false });
    expect(geenMateriaal.regels.map((x) => x.soort)).toEqual(["arbeid", "voorrijkosten"]);
  });

  it("geeft een doorlooptijd in dagdelen en werkdagen", () => {
    const r = reken([product({ id: "a" }), product({ id: "b" })], { hoeveelheden: { a: 30, b: 20 } });
    expect(r.doorlooptijd).toEqual({ dagdelen: 5, werkdagen: 3 });
  });
});

describe("rekenkern: extra's", () => {
  const p = product({
    id: "a",
    extraOpties: [
      { id: "afvoer", naam: "Afvoer oude bestrating", prijs: 5, type: "PER_EENHEID" },
      { id: "lamp", naam: "Lichtpunt", prijs: 45, type: "PER_STUK" },
      { id: "toeslag", naam: "Toeslag moeilijke toegang", prijs: 100, type: "PER_STUK", altijd: true },
    ],
  });
  it("rekent meerprijs per eenheid, per stuk en een vaste toeslag", () => {
    const r = reken([p], { hoeveelheden: { a: 20 }, extraKeuzes: { afvoer: 1, lamp: 3 } });
    expect(soort(r, "extra").map((x) => [x.omschrijving, x.aantal, x.bedragExclCenten])).toEqual([
      ["Afvoer oude bestrating", 20, 10000],
      ["Lichtpunt", 3, 13500],
      ["Toeslag moeilijke toegang", 1, 10000],
    ]);
  });
  it("laat niet-gekozen extra's weg, maar de toeslag blijft", () => {
    const r = reken([p], { hoeveelheden: { a: 20 } });
    expect(soort(r, "extra").map((x) => x.omschrijving)).toEqual(["Toeslag moeilijke toegang"]);
  });
});

describe("rekenkern: sjablonen", () => {
  it("lengte × breedte", () => {
    const p = product({ id: "a", sjabloon: "AFMETINGEN", sjabloonConfig: { metDiepte: false } });
    const r = reken([p], { sjabloonInvoer: { a: { lengte: 12, breedte: 4 } } });
    expect(r.onderdelen[0].hoeveelheid).toBe(48);
    expect(soort(r, "materiaal")[0].bedragExclCenten).toBe(96000);
  });
  it("artikelregels: elk artikeltype een eigen regel", () => {
    const p = product({
      id: "a",
      sjabloon: "ARTIKELREGELS",
      sjabloonConfig: { artikelTypes: [{ id: "poort", naam: "Tuinpoort", prijsPerEenheid: 450, berekening: "stuk" }, { id: "scherm", naam: "Scherm", prijsPerEenheid: 80, berekening: "m2" }] },
      productiviteit: null,
      materiaalCategorieen: [],
    });
    const r = reken([p], { sjabloonInvoer: { a: { regels: [{ artikelTypeId: "poort", aantal: 2, breedte: 0, hoogte: 0 }, { artikelTypeId: "scherm", aantal: 1, breedte: 2, hoogte: 1.5 }] } } });
    expect(soort(r, "artikel").map((x) => [x.omschrijving, x.aantal, x.bedragExclCenten])).toEqual([["Tuinpoort", 2, 90000], ["Scherm", 3, 24000]]);
  });
});

describe("rekenkern: btw en KOR", () => {
  it("rekent 9% en 21%", () => {
    const a = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, { btwPercentage: 9 });
    expect(a.btwCenten).toBe(Math.round(a.subtotaalExclCenten * 0.09));
    const b = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, { btwPercentage: 21 });
    expect(b.btwGroepen).toEqual([{ tarief: 21, grondslagCenten: b.subtotaalExclCenten, btwCenten: b.btwCenten }]);
  });
  it("KOR: geen btw", () => {
    const r = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, {}, { kor: true });
    expect(r.btwCenten).toBe(0);
    expect(r.totaalInclCenten).toBe(r.subtotaalExclCenten);
    expect(r.kor).toBe(true);
  });
});

describe("rekenkern: bandbreedte", () => {
  const p = product({ id: "a", materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("m", "M", 20, { prijsType: "BANDBREEDTE", prijsMin: 15, prijsMax: 25 })] }] });
  it("per product: van–tot uit de laagste en hoogste prijs, de regels tonen het midden", () => {
    const r = reken([p], { hoeveelheden: { a: 10 } }, { bandbreedteModus: "PER_PRODUCT" });
    expect(soort(r, "materiaal")[0].prijsPerEenheidCenten).toBe(2000);
    expect(r.bandbreedte?.min.kosten.materiaal).toBe(15000);
    expect(r.bandbreedte?.max.kosten.materiaal).toBe(25000);
    expect(r.bandbreedte!.min.totaalInclCenten).toBeLessThan(r.bandbreedte!.max.totaalInclCenten);
  });
  it("totaal: marge omlaag en omhoog over het totaal", () => {
    const r = reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, { bandbreedteModus: "TOTAAL", bandbreedteMargeOmlaag: 10, bandbreedteMargeOmhoog: 20 });
    expect(r.bandbreedte?.min.totaalInclCenten).toBe(Math.round(r.totaalInclCenten * 0.9));
    expect(r.bandbreedte?.max.totaalInclCenten).toBe(Math.round(r.totaalInclCenten * 1.2));
  });
  it("geen bandbreedte als het bereik niet verschilt", () => {
    expect(reken([product({ id: "a" })], { hoeveelheden: { a: 20 } }, { bandbreedteModus: "PER_PRODUCT" }).bandbreedte).toBeNull();
  });
});

describe("rekenkern: robuust tegen ongeldige invoer", () => {
  it.each([NaN, Infinity, -Infinity, -5, 1e300, 0])("hoeveelheid %s geeft nooit een kapotte prijs", (h) => {
    const r = reken([product({ id: "a" })], { hoeveelheden: { a: h } });
    expect(Number.isInteger(r.totaalInclCenten)).toBe(true);
    expect(r.totaalInclCenten).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.totaalInclCenten)).toBe(true);
    if (h !== 0 && !(h > 0 && Number.isFinite(h) && h < 1e6)) expect(r.waarschuwingen.length + (r.heeftSelectie ? 0 : 1)).toBeGreaterThan(0);
  });
  it("een prijs van 0 geeft een waarschuwing", () => {
    const r = reken([product({ id: "a", materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("m", "Gratis", 0)] }] })], { hoeveelheden: { a: 5 } });
    expect(r.waarschuwingen.map((w) => w.code)).toContain("ontbrekende-prijs");
  });
  it("werktempo 0 geeft een waarschuwing en telt geen arbeid", () => {
    const r = reken([product({ id: "a", productiviteit: null })], { hoeveelheden: { a: 5 } });
    expect(r.waarschuwingen.map((w) => w.code)).toContain("geen-werktempo");
    expect(soort(r, "arbeid")).toHaveLength(0);
  });
  it("een onbekend materiaal geeft een waarschuwing", () => {
    const r = reken([product({ id: "a", materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("m1", "A", 5), optie("m2", "B", 6)] }] })], { hoeveelheden: { a: 5 }, materiaalKeuzes: { c: "bestaat-niet" } });
    expect(r.waarschuwingen.map((w) => w.code)).toContain("onbekende-keuze");
  });
});

// ── Overgenomen uit de tests van de oude berekening (calculate.ts): dezelfde scenario's, nu op de kern ──

describe("rekenkern: scenario's van de oude berekening", () => {
  const paneel = { id: "categorie-paneel", naam: "Paneel", materialen: [optie("paneel-1", "Paneel douglas", 65)] };
  const palen = { id: "categorie-palen", naam: "Palen", materialen: [optie("paal-1", "Paal standaard", 15)] };

  it("één regel per categorie, niet alleen de eerste", () => {
    const r = reken([product({ id: "h", eenheid: "m1", materiaalCategorieen: [paneel, palen] })], { hoeveelheden: { h: 20 } });
    expect(soort(r, "materiaal").map((x) => [x.categorie, x.aantal, x.prijsPerEenheidCenten, x.bedragExclCenten])).toEqual([["Paneel", 20, 6500, 130000], ["Palen", 20, 1500, 30000]]);
    expect(r.kosten.materiaal).toBe(160000);
  });

  it("stapgrootte rondt per regel op een veelvoud: 21 → 22", () => {
    const metStap = { ...palen, materialen: [optie("paal-1", "Paal", 15, { stapgrootte: 2 })] };
    const r = reken([product({ id: "h", eenheid: "m1", materiaalCategorieen: [paneel, metStap] })], { hoeveelheden: { h: 21 } });
    expect(soort(r, "materiaal").map((x) => x.aantal)).toEqual([21, 22]);
  });

  it("slaat een categorie zonder eenduidige keuze over", () => {
    const kleur = { id: "kleur", naam: "Kleur", materialen: [optie("rood", "Rood", 5), optie("groen", "Groen", 6)] };
    const r = reken([product({ id: "h", eenheid: "m1", materiaalCategorieen: [paneel, kleur] })], { hoeveelheden: { h: 20 } });
    expect(soort(r, "materiaal").map((x) => x.categorie)).toEqual(["Paneel"]);
  });

  it("10 m schutting in douglas: materiaal 280, arbeid 240, transport 45, voorrijkosten 35 → 600", () => {
    const p = product({ id: "s", eenheid: "m1", productiviteit: 10, transportkostenOverride: 45, materiaalCategorieen: [{ id: "c", naam: "Hout", materialen: [optie("d", "Douglas", 28)] }] });
    const r = reken([p], { hoeveelheden: { s: 10 } }, { arbeidTariefDagdeel: 240, voorrijTarief: 35 });
    expect(r.kosten).toMatchObject({ materiaal: 28000, arbeid: 24000, transport: 4500, voorrijkosten: 3500 });
    expect(r.subtotaalExclCenten).toBe(60000);
  });

  it("transport per dag: 20 m / 6 per dagdeel = 3,33 dagdeel = 2 dagen; arbeid € 800", () => {
    const k = { arbeidTariefDagdeel: 240, transportTarief: 65 };
    const basis = { id: "t", eenheid: "m1", productiviteit: 6, materiaalCategorieen: [] };
    expect(soort(reken([product(basis)], { hoeveelheden: { t: 20 } }, k), "arbeid")[0].bedragExclCenten).toBe(80000);
    expect(soort(reken([product(basis)], { hoeveelheden: { t: 20 } }, k), "transport")[0].bedragExclCenten).toBe(6500);
    expect(soort(reken([product({ ...basis, transportPerDag: true })], { hoeveelheden: { t: 20 } }, k), "transport")[0].bedragExclCenten).toBe(13000);
    // arbeidseenheid dag, 5 per dag: 4 dagen
    expect(soort(reken([product({ ...basis, productiviteit: 5, transportPerDag: true })], { hoeveelheden: { t: 20 } }, { ...k, arbeidStapEenheid: "DAG" }), "transport")[0].bedragExclCenten).toBe(26000);
    // zonder werktempo: één keer
    expect(soort(reken([product({ ...basis, productiviteit: null, transportPerDag: true })], { hoeveelheden: { t: 20 } }, k), "transport")[0].bedragExclCenten).toBe(6500);
  });

  it("een duurder materiaal verhoogt de arbeid niet", () => {
    const maak = (prijs: number) => product({ id: "a", materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("m", "M", prijs)] }] });
    expect(soort(reken([maak(10)], { hoeveelheden: { a: 10 } }), "arbeid")[0].bedragExclCenten).toBe(soort(reken([maak(900)], { hoeveelheden: { a: 10 } }), "arbeid")[0].bedragExclCenten);
  });
});
