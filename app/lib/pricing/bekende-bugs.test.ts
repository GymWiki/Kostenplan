import { describe, expect, it } from "vitest";
import type { CalcCostSettings, CalcProduct } from "@/app/lib/calculate";
import { berekenKostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { berekenPrijs } from "./engine";
import { prefillOfferteRegels, offerteSubtotaal } from "@/app/lib/offertes";
import { bouwOfferteUitLead } from "@/app/lib/offerte/uit-lead";

// Stap 1 van de rekenkern: de twee bekende bugs als tests. Deze tests beschrijven wat er hoort te
// gebeuren; ze moeten slagen zodra overal dezelfde rekenkern wordt gebruikt.

const kosten: CalcCostSettings = {
  arbeidEnabled: true, arbeidStapEenheid: "DAGDEEL", arbeidTariefUur: 0, arbeidTariefDagdeel: 280, arbeidTariefDag: 0, arbeidAfronden: false,
  transportEnabled: true, transportTarief: 60, voorrijEnabled: true, voorrijTarief: 35, materiaalEnabled: true, btwPercentage: 21,
  bandbreedteModus: "GEEN", bandbreedteMargeOmlaag: 0, bandbreedteMargeOmhoog: 0,
};

const optie = (id: string, naam: string, prijs: number) => ({ id, naam, prijs, prijsType: "VAST" as const, prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null });

// Terras van 20 m² met twee materiaalcategorieën: tegels (€ 40) en zand (€ 8).
const terras: CalcProduct & { naam: string; eenheid: string } = {
  id: "terras", naam: "Terras", eenheid: "m2", productiviteit: 10, arbeidTariefOverride: null,
  transportkostenOverride: null, transportMeeschalend: false, voorrijkostenOverride: null, voorrijMeeschalend: false, extraOpties: [],
  materiaalCategorieen: [
    { id: "tegels", naam: "Tegels", materialen: [optie("betontegel", "Betontegel", 40)] },
    { id: "zand", naam: "Zand", materialen: [optie("straatzand", "Straatzand", 8)] },
  ],
};
const selecties = { tegels: "betontegel", zand: "straatzand" };
// 20 × 40 + 20 × 8 = 960 materiaal; arbeid 2 dagdelen × 280 = 560; voorrijkosten 35; transport 60.
const VERWACHT_SUBTOTAAL = 960 + 560 + 35 + 60;

function bouwSnapshot() {
  const config = configVanProducten([terras], kosten);
  const invoer = invoerVanKlant({ producten: [terras], hoeveelheden: { terras: 20 }, materiaalKeuzes: selecties });
  const resultaat = berekenPrijs(config, invoer);
  return { resultaat, snapshot: bouwLeadSnapshot({ config, invoer, resultaat }) };
}

describe("bug 1: meerdere materiaalcategorieën in het rekenvoorbeeld", () => {
  it("telt de materiaalkosten van alle categorieën mee in de opbouw", () => {
    const o = berekenKostenOpbouw({ product: terras as never, optieId: null, hoeveelheid: 20, costSettings: kosten });
    expect(o.materiaal).toBe(960);
    expect(o.totaal).toBe(VERWACHT_SUBTOTAAL);
  });

  it("geeft per categorie een eigen regel (aantal × prijs per eenheid)", () => {
    const o = berekenKostenOpbouw({ product: terras as never, optieId: null, hoeveelheid: 20, costSettings: kosten });
    expect(o.materiaalRegels.map((r) => [r.categorie, r.aantal, r.prijsPerEenheid, r.bedrag])).toEqual([["Tegels", 20, 40, 800], ["Zand", 20, 8, 160]]);
  });
});

describe("bug 2: offerte uit een aanvraag", () => {
  it("v1-prefill maakt losse regels per categorie, arbeid, transport en voorrijkosten, geen restpost", () => {
    const { snapshot } = bouwSnapshot();
    const regels = prefillOfferteRegels(snapshot);
    expect(regels.map((r) => r.omschrijving)).not.toContain("Materiaal- en overige kosten");
    expect(regels.length).toBeGreaterThanOrEqual(5); // tegels, zand, arbeid, voorrijkosten, transport
    expect(regels.every((r) => r.aantal <= 0 || r.prijsPerEenheid > 0)).toBe(true);
    expect(offerteSubtotaal(regels)).toBeCloseTo(VERWACHT_SUBTOTAAL, 2);
  });

  it("v1-prefill van een snapshot zonder prijs per regel laat geen €0-regel en geen samengevoegde restpost achter", () => {
    const { snapshot } = bouwSnapshot();
    const oud = { ...snapshot, regels: snapshot.regels.map((r) => ({ ...r, prijs: undefined, opbouw: undefined })) };
    const regels = prefillOfferteRegels(oud);
    expect(regels.map((r) => r.omschrijving)).not.toContain("Materiaal- en overige kosten");
    expect(regels.every((r) => r.aantal <= 0 || r.prijsPerEenheid > 0)).toBe(true);
    expect(offerteSubtotaal(regels)).toBeCloseTo(VERWACHT_SUBTOTAAL, 2);
  });

  it("v2-builder maakt voor een snapshot zonder opbouw losse regels uit de totalen (materiaal, arbeid, transport, voorrijkosten)", () => {
    const { snapshot } = bouwSnapshot();
    const oud = { ...snapshot, regels: snapshot.regels.map((r) => ({ ...r, prijs: undefined, opbouw: undefined })) };
    const r = bouwOfferteUitLead(oud);
    const omschrijvingen = r.secties.flatMap((s) => s.regels.map((x) => x.omschrijving.toLowerCase()));
    expect(omschrijvingen.some((o) => o.includes("arbeid"))).toBe(true);
    expect(omschrijvingen.some((o) => o.includes("transport"))).toBe(true);
    expect(omschrijvingen.some((o) => o.includes("voorrijkosten"))).toBe(true);
    const som = r.secties.flatMap((s) => s.regels).reduce((s, x) => s + Math.round(x.aantal * x.prijsCenten), 0);
    expect(som).toBe(VERWACHT_SUBTOTAAL * 100);
  });

  it("v2-builder: met opbouw één regel per categorie en het totaal klopt exact", () => {
    const { snapshot } = bouwSnapshot();
    const r = bouwOfferteUitLead(snapshot);
    const omschrijvingen = r.secties.flatMap((s) => s.regels.map((x) => x.omschrijving));
    expect(omschrijvingen).toEqual(expect.arrayContaining(["Betontegel", "Straatzand", "Arbeid"]));
    const som = r.secties.flatMap((s) => s.regels).reduce((s, x) => s + Math.round(x.aantal * x.prijsCenten), 0);
    expect(som).toBe(VERWACHT_SUBTOTAAL * 100);
  });
});
