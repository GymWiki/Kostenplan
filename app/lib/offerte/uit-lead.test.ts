import { describe, expect, it } from "vitest";
import { bouwOfferteUitLead } from "./uit-lead";
import type { LeadSnapshot } from "@/app/lib/leads";

// Fase 0: falende regressietest voor de €0-bug. Een lead wordt omgezet naar een
// offerte met per onderdeel een sectie en losse regels (materiaal, arbeid,
// transport, voorrijkosten, extra's) met de échte prijs per eenheid. Nooit een
// bedragregel op €0 en nooit één samengevoegde regel "Materiaal- en overige kosten".
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
  subtotaal: 2400,
  btw: 504,
  totaal: 2904,
};

describe("bouwOfferteUitLead (regressie €0-regel)", () => {
  it("maakt losse regels met echte prijzen en nooit een restpost", () => {
    const o = bouwOfferteUitLead(snapshotMetOpbouw);
    const regels = o.secties.flatMap((s) => s.regels);
    expect(o.secties).toHaveLength(1);
    expect(o.secties[0].titel).toMatch(/Schutting/);
    expect(regels.some((r) => /Materiaal- en overige kosten/.test(r.omschrijving))).toBe(false);
    expect(regels.filter((r) => r.type !== "tekst").every((r) => r.prijsCenten > 0)).toBe(true);
    const materiaal = regels.find((r) => /Douglas/.test(r.omschrijving))!;
    expect(materiaal.aantal).toBe(20);
    expect(materiaal.prijsCenten).toBe(8500);
  });

  it("valt voor oude snapshots zonder opbouw terug op één echte regel per onderdeel (geen €0)", () => {
    const oud: LeadSnapshot = {
      ...snapshotMetOpbouw,
      regels: [{ naam: "Terras", type: "product", aantal: 90, eenheid: "m2", prijs: 3600 }],
      subtotaal: 3600,
    };
    const regels = bouwOfferteUitLead(oud).secties.flatMap((s) => s.regels);
    expect(regels).toHaveLength(1);
    expect(regels[0].prijsCenten).toBe(4000);
  });
});
