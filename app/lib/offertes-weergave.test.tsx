import { describe, expect, it, vi } from "vitest";

// next/font werkt alleen in Next zelf.
vi.mock("@/app/offerte/[token]/offerte-reactie-form", () => ({ OfferteReactieForm: () => null }));
vi.mock("@/app/lib/fonts", () => ({ fontFamilyFor: () => "sans-serif", brandingFontVariables: () => "" }));
import { renderToStaticMarkup } from "react-dom/server";
import { berekenOfferteTotalen, offerteWeergaveRegels, weergaveDetail, RESTPOST_WEERGAVE_NAAM, type OfferteRegel } from "./offertes";
import { OffertePresentatie } from "@/app/offerte/[token]/offerte-presentatie";
import { OffertePreview } from "@/app/dashboard/leads/[leadId]/offerte/offerte-preview";
import { bouwOfferteUitLead } from "./offerte/uit-lead";
import type { LeadSnapshot } from "./leads";

// Regressie: een oude offerte met elk onderdeel op € 0,00 en één restpost "Materiaal- en overige kosten" toonde de
// onderdelen als gratis. De weergave bouwt per onderdeel één totaalprijs uit de bevroren aanvraag, mits het subtotaal
// tot op de cent gelijk is; de totalen zelf komen altijd uit de opgeslagen regels.
const snapshotPerOnderdeel: LeadSnapshot = {
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

const verouderd: OfferteRegel[] = [
  { id: "snapshot-0", omschrijving: "Schutting", aantal: 10, eenheid: "m1", prijsPerEenheid: 0 },
  { id: "snapshot-1", omschrijving: "Terras aanleggen", aantal: 90, eenheid: "m2", prijsPerEenheid: 0 },
  { id: "snapshot-restant", omschrijving: "Materiaal- en overige kosten", aantal: 1, eenheid: "post", prijsPerEenheid: 5960 },
];

const nbsp = (t: string) => t.replace(/€ /g, "€\u00a0");
const som = (r: { totaal: number | null }[]) => Math.round(r.reduce((s, x) => s + (x.totaal ?? 0), 0) * 100);

describe("offerteWeergaveRegels", () => {
  it("toont per onderdeel zijn eigen prijs en geen restpost; de som is het subtotaal", () => {
    const { regels, bron } = offerteWeergaveRegels(verouderd, snapshotPerOnderdeel);
    expect(bron).toBe("uit-aanvraag");
    expect(regels.map((r) => [r.omschrijving, r.totaal])).toEqual([["Schutting", 2360], ["Terras aanleggen", 3600]]);
    expect(regels.map(weergaveDetail)).toEqual(["10 m", "90 m²"]);
    expect(som(regels)).toBe(Math.round(berekenOfferteTotalen(verouderd, 21).subtotaal * 100));
    expect(regels.some((r) => /Materiaal- en overige/.test(r.omschrijving))).toBe(false);
  });

  it("de totalen blijven exact die van de opgeslagen offerte", () => {
    expect(berekenOfferteTotalen(verouderd, 21)).toEqual({ subtotaal: 5960, btw: 1251.6, totaal: 7211.6 });
  });

  it("zonder aanvraag: geen € 0,00 en een duidelijk benoemde regel voor de kosten die niet te verdelen zijn", () => {
    const { regels, bron } = offerteWeergaveRegels(verouderd, null);
    expect(bron).toBe("opgeslagen-zonder-uitsplitsing");
    expect(regels[0]).toMatchObject({ omschrijving: "Schutting", prijsTekst: null, totaal: null });
    expect(regels[2]).toMatchObject({ omschrijving: RESTPOST_WEERGAVE_NAAM, totaal: 5960 });
    expect(regels.map(weergaveDetail).join(" ")).not.toMatch(/0,00/);
    expect(som(regels)).toBe(596000);
  });

  it("als de aanvraag niet tot op de cent hetzelfde subtotaal geeft, wordt er niets verzonnen", () => {
    const anders: LeadSnapshot = { ...snapshotPerOnderdeel, regels: [{ ...snapshotPerOnderdeel.regels[0], prijs: 2361 }, snapshotPerOnderdeel.regels[1]] };
    expect(offerteWeergaveRegels(verouderd, anders).bron).toBe("opgeslagen-zonder-uitsplitsing");
  });

  it("een gewone offerte blijft precies zoals opgeslagen (ook een bewuste regel van € 0,00)", () => {
    const gewoon: OfferteRegel[] = [
      { id: "a", omschrijving: "Klinkers", aantal: 90, eenheid: "m2", prijsPerEenheid: 40 },
      { id: "b", omschrijving: "Cadeau: extra bloembak", aantal: 1, eenheid: "stuk", prijsPerEenheid: 0 },
    ];
    const { regels, bron } = offerteWeergaveRegels(gewoon, snapshotPerOnderdeel);
    expect(bron).toBe("opgeslagen");
    expect(regels.map(weergaveDetail)).toEqual(["90 m2 × € 40,00", "1 stuk × € 0,00"].map(nbsp));
  });

  it("nul-offerte en lege offerte geven geen fouten, undefined of NaN", () => {
    expect(offerteWeergaveRegels([], null).regels).toEqual([]);
    const nul: OfferteRegel[] = [{ id: "a", omschrijving: "Niets", aantal: 0, eenheid: "post", prijsPerEenheid: 0 }];
    expect(JSON.stringify(offerteWeergaveRegels(nul, null).regels)).not.toMatch(/undefined|NaN/);
  });

  it("met kosten per onderdeel, een losse post en meerdere onderdelen: onderdelen krijgen hun totaal, vaste kosten blijven apart", () => {
    const snap: LeadSnapshot = {
      regels: [
        {
          naam: "Schutting", type: "product", aantal: 20, eenheid: "m1", prijs: 2305,
          opbouw: { materiaal: [{ naam: "Douglas schutting", hoeveelheid: 20, eenheid: "m1", prijsPerEenheid: 85, bedrag: 1700 }], arbeid: { tijd: 8, eenheid: "uur", tarief: 55, bedrag: 440 }, extras: [{ naam: "Scharnieren", aantal: 1, bedrag: 165 }] },
        },
        { naam: "Terras", type: "product", aantal: 90, eenheid: "m2", prijs: 3600 },
      ],
      arbeidskosten: 440, materiaalkosten: 1865, transportkosten: 0, voorrijkosten: 0, subtotaal: 5905, btw: 1240, totaal: 7145,
    };
    const bouw = bouwOfferteUitLead(snap);
    const echt = bouw.secties.flatMap((s) => s.regels).reduce((t, r) => t + Math.round(r.aantal * r.prijsCenten), 0);
    const opgeslagen: OfferteRegel[] = [
      { id: "snapshot-0", omschrijving: "Schutting", aantal: 20, eenheid: "m1", prijsPerEenheid: 0 },
      { id: "snapshot-1", omschrijving: "Terras", aantal: 90, eenheid: "m2", prijsPerEenheid: 0 },
      { id: "snapshot-restant", omschrijving: "Materiaal- en overige kosten", aantal: 1, eenheid: "post", prijsPerEenheid: echt / 100 },
    ];
    const { regels, bron } = offerteWeergaveRegels(opgeslagen, snap);
    expect(bron).toBe("uit-aanvraag");
    expect(regels.every((r) => (r.totaal ?? 0) > 0)).toBe(true);
    expect(regels[0].totaal).toBe(2305);
    expect(som(regels)).toBe(echt);
  });
});

describe("losse posten", () => {
  it("voorrijkosten en transport blijven aparte, benoemde regels naast het onderdeel", () => {
    const snap: LeadSnapshot = {
      regels: [
        {
          naam: "Schutting", type: "product", aantal: 20, eenheid: "m1", prijs: 2400,
          opbouw: { materiaal: [{ naam: "Douglas schutting", hoeveelheid: 20, eenheid: "m1", prijsPerEenheid: 85, bedrag: 1700 }], arbeid: { tijd: 8, eenheid: "uur", tarief: 55, bedrag: 440 }, transport: { bedrag: 60, meeschalend: false }, voorrijkosten: { bedrag: 35, meeschalend: false } },
        },
      ],
      arbeidskosten: 440, materiaalkosten: 1700, transportkosten: 60, voorrijkosten: 35, subtotaal: 2235, btw: 469.35, totaal: 2704.35,
    };
    const echt = bouwOfferteUitLead(snap).secties.flatMap((s) => s.regels).reduce((t, r) => t + Math.round(r.aantal * r.prijsCenten), 0);
    const opgeslagen: OfferteRegel[] = [
      { id: "snapshot-0", omschrijving: "Schutting", aantal: 20, eenheid: "m1", prijsPerEenheid: 0 },
      { id: "snapshot-restant", omschrijving: "Materiaal- en overige kosten", aantal: 1, eenheid: "post", prijsPerEenheid: echt / 100 },
    ];
    const { regels, bron } = offerteWeergaveRegels(opgeslagen, snap);
    expect(bron).toBe("uit-aanvraag");
    expect(regels.map((r) => r.omschrijving)).toEqual(["Schutting", "Voorrijkosten", "Transport"]);
    expect(regels[0].totaal).toBe(1700 + 440);
    expect(som(regels)).toBe(echt);
  });
});

describe("dezelfde bedragen op klantpagina en hovenier-preview", () => {
  const props = {
    bedrijfsnaam: "Pieters Tuinen",
    klantNaam: "Klant",
    btwPercentage: 21,
    geldigTot: new Date("2026-01-01"),
    voorwaardenTekst: "",
  };
  it("tonen € 2.360,00, € 3.600,00 en het totaal, nooit € 0,00 of de restpost", () => {
    const weergave = offerteWeergaveRegels(verouderd, snapshotPerOnderdeel).regels;
    const klant = renderToStaticMarkup(
      <OffertePresentatie {...props} introTekst={null} deelToken="t" logoUrl={null} primaireKleur="#15803d" achtergrondKleur="#fff" fontFamily="sans-serif" regels={verouderd} weergaveRegels={weergave} gereageerdOp={null} updatedAt={new Date("2025-12-01")} status="VERLOPEN" contactEmail={null} contactTelefoonnummer={null} />
    );
    const preview = renderToStaticMarkup(<OffertePreview {...props} introTekst="" branding={null} regels={verouderd} snapshot={snapshotPerOnderdeel} />);
    for (const raw of [klant, preview]) {
      const html = raw.replace(/\u00a0/g, " ");
      expect(html).toContain("€ 2.360,00");
      expect(html).toContain("€ 3.600,00");
      expect(html).toContain("€ 7.211,60");
      expect(html).not.toMatch(/Materiaal- en overige|€\s?0,00|undefined|NaN/);
    }
    expect(klant).toContain("Deze offerte is verlopen");
  });
});
