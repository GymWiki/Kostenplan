import { describe, expect, it } from "vitest";
import { prefillOfferteRegels, regelTotaal, offerteSubtotaal, heeftVerouderdeBerekening } from "./offertes";
import type { LeadSnapshot } from "./leads";
import type { OfferteRegel } from "./offertes";

describe("prefillOfferteRegels", () => {
  it("geeft elke productregel zijn eigen prijs i.p.v. alles in één restpost te proppen (regressie)", () => {
    // Zelfde vorm als de bug: een schutting (10 m¹) en een terras (90 m²),
    // allebei met hun eigen, al berekende prijs (zie calculate.ts's
    // ProductRegel — dat is hoe de calculator lijn.prijs vult).
    const snapshot: LeadSnapshot = {
      regels: [
        {
          naam: "Schutting",
          type: "product",
          aantal: 10,
          eenheid: "m1",
          materiaal: "Douglas, Blank rabb...",
          prijs: 2360,
        },
        {
          naam: "Terras aanleggen",
          type: "product",
          aantal: 90,
          eenheid: "m2",
          materiaal: "Standaard",
          prijs: 3600,
        },
      ],
      arbeidskosten: 0,
      materiaalkosten: 0,
      transportkosten: 0,
      voorrijkosten: 0,
      subtotaal: 5960,
      btw: 1251.6,
      totaal: 7211.6,
    };

    const regels = prefillOfferteRegels(snapshot);

    // Geen giswerk: precies één regel per product uit de snapshot, geen
    // extra "Materiaal- en overige kosten"-restpost die alles opslokt.
    expect(regels).toHaveLength(2);
    expect(regels[0].prijsPerEenheid).toBeCloseTo(2360 / 10, 6);
    expect(regels[0].prijsPerEenheid).not.toBe(0);
    expect(regels[1].prijsPerEenheid).toBeCloseTo(3600 / 90, 6);
    expect(regels[1].prijsPerEenheid).not.toBe(0);

    // Wijzig je de hoeveelheid van een regel, dan verandert de prijs
    // mee — dat vereist dat prijsPerEenheid > 0 is, niet dat het bedrag
    // ergens anders in een ongerelateerde regel zit.
    expect(regelTotaal(regels[0])).toBeCloseTo(2360, 6);
    expect(regelTotaal(regels[1])).toBeCloseTo(3600, 6);

    // Het totaal na de fix blijft gelijk aan wat de klant zag — alleen de
    // verdeling over de regels verandert.
    expect(offerteSubtotaal(regels)).toBeCloseTo(snapshot.subtotaal, 6);
  });

  it("valt terug op een restpost als een regel toch geen prijs heeft (vangnet, bijv. oude snapshots)", () => {
    const snapshot: LeadSnapshot = {
      regels: [{ naam: "Schutting", type: "product", aantal: 10, eenheid: "m1", prijs: undefined }],
      arbeidskosten: 0,
      materiaalkosten: 0,
      transportkosten: 0,
      voorrijkosten: 0,
      subtotaal: 500,
      btw: 105,
      totaal: 605,
    };

    const regels = prefillOfferteRegels(snapshot);

    expect(regels).toHaveLength(2);
    expect(regels[0].prijsPerEenheid).toBe(0);
    expect(regels[1].omschrijving).toBe("Materiaal- en overige kosten");
    expect(regels[1].prijsPerEenheid).toBe(500);
    expect(offerteSubtotaal(regels)).toBeCloseTo(snapshot.subtotaal, 6);
  });

  it("laat geen restpost achter als alle regels al kloppen (geen centverschil dat als 'post' wordt getoond)", () => {
    const snapshot: LeadSnapshot = {
      regels: [
        { naam: "Schutting", type: "product", aantal: 10, eenheid: "m1", prijs: 2360 },
        { naam: "Terras aanleggen", type: "product", aantal: 90, eenheid: "m2", prijs: 3600 },
      ],
      arbeidskosten: 0,
      materiaalkosten: 0,
      transportkosten: 0,
      voorrijkosten: 0,
      subtotaal: 5960,
      btw: 1251.6,
      totaal: 7211.6,
    };

    const regels = prefillOfferteRegels(snapshot);
    expect(regels.some((regel) => regel.id === "snapshot-restant")).toBe(false);
  });
});

describe("heeftVerouderdeBerekening", () => {
  it("herkent een concept met de vangnet-restpost als verouderd", () => {
    const regels: OfferteRegel[] = [
      { id: "snapshot-0", omschrijving: "Schutting", aantal: 10, eenheid: "m1", prijsPerEenheid: 0 },
      { id: "snapshot-restant", omschrijving: "Materiaal- en overige kosten", aantal: 1, eenheid: "post", prijsPerEenheid: 5960 },
    ];
    expect(heeftVerouderdeBerekening(regels)).toBe(true);
  });

  it("een concept zonder restpost telt niet als verouderd", () => {
    const regels: OfferteRegel[] = [
      { id: "snapshot-0", omschrijving: "Schutting", aantal: 10, eenheid: "m1", prijsPerEenheid: 236 },
      { id: "snapshot-1", omschrijving: "Terras aanleggen", aantal: 90, eenheid: "m2", prijsPerEenheid: 40 },
    ];
    expect(heeftVerouderdeBerekening(regels)).toBe(false);
  });

  it("een handmatig door de vakman toegevoegde regel (eigen uuid) triggert de melding niet", () => {
    // addRegel() in offerte-editor.tsx geeft nieuwe regels een
    // crypto.randomUUID() — nooit het gereserveerde "snapshot-restant"-id,
    // dus een vakman die zelf een "overige kosten"-regel toevoegt krijgt
    // hier geen valse melding over.
    const regels: OfferteRegel[] = [
      { id: "3f1a2b0a-1111-4a1a-9a1a-000000000001", omschrijving: "Overige kosten", aantal: 1, eenheid: "post", prijsPerEenheid: 150 },
    ];
    expect(heeftVerouderdeBerekening(regels)).toBe(false);
  });
});
