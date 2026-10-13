import { describe, expect, it } from "vitest";
import { planKort, abonnementRegel, bedrag, domeinVan, initialen, ontbreektTekst, tarievenRegel, werkgebiedRegel } from "./samenvattingen";
import { werkgebiedInstellingenSchema } from "@/app/lib/werkgebied/schema";

const basis = { handmatigToegekend: false, periodeEind: null, gepauzeerdTot: null, gebruikteOnderdelen: 2, limietOnderdelen: 3, nu: new Date("2026-10-13T10:00:00Z") };

describe("abonnementRegel", () => {
  it("actief: plan en verlengdatum", () => {
    expect(abonnementRegel({ ...basis, plan: "PRO", status: "ACTIVE", periodeEind: new Date("2026-11-12T10:00:00Z") })).toEqual({ tekst: "Pro · verlengt op 12 november", letOp: false, opnieuwAbonneren: false });
  });
  it("opgezegd met lopende periode: tot-datum, oranje, opnieuw abonneren", () => {
    expect(abonnementRegel({ ...basis, plan: "PRO", status: "CANCELED", gepauzeerdTot: new Date("2026-11-12T10:00:00Z") })).toEqual({ tekst: "Pro tot 12 november, daarna Gratis", letOp: true, opnieuwAbonneren: true });
  });
  it("gratis: aantal onderdelen", () => {
    expect(abonnementRegel({ ...basis, plan: "GRATIS", status: "GEEN" }).tekst).toBe("Gratis · 2 van 3 onderdelen");
    expect(abonnementRegel({ ...basis, plan: "GRATIS", status: "CANCELED" }).opnieuwAbonneren).toBe(false);
  });
  it("betaling mislukt is oranje; handmatig toegekend is rustig", () => {
    expect(abonnementRegel({ ...basis, plan: "PLUS", status: "SUSPENDED" })).toMatchObject({ tekst: "Plus · betaling mislukt", letOp: true });
    expect(abonnementRegel({ ...basis, plan: "PRO", status: "GEEN", handmatigToegekend: true }).tekst).toBe("Pro · handmatig toegekend");
  });
});

describe("overige samenvattingen", () => {
  it("werkgebied en minimum", () => {
    const i = werkgebiedInstellingenSchema.parse({ werkgebied: { aan: true, straalKm: 25, start: { postcode: "8011AB", huisnummer: "1", lat: 52.5, lon: 6.1, plaats: "Zwolle" } }, minimum: { aan: true, bedragEuro: 250 } });
    expect(werkgebiedRegel(i)).toBe("25 km rond Zwolle · vanaf € 250");
    expect(werkgebiedRegel(werkgebiedInstellingenSchema.parse({}))).toBe("Uit");
  });
  it("domein en initialen", () => {
    expect(domeinVan("https://www.dennenlaan.nl/contact")).toBe("dennenlaan.nl");
    expect(domeinVan("dennenlaan.nl")).toBe("dennenlaan.nl");
    expect(domeinVan("")).toBeNull();
    expect(initialen("Hoveniersbedrijf De Vries")).toBe("HD");
    expect(initialen("Tuin")).toBe("TU");
  });
});

describe("tarieven en ontbrekende gegevens", () => {
  it("bedragen zonder ,00", () => {
    expect(bedrag(45)).toBe("€ 45");
    expect(bedrag(45.5)).toBe("€ 45,50");
    expect(tarievenRegel({ eenheid: "UUR", tarief: 45, voorrij: 35 })).toBe("€ 45 per uur · voorrijkosten € 35");
  });
  it("concrete tekst bij ontbrekende gegevens", () => {
    expect(ontbreektTekst(0)).toBeNull();
    expect(ontbreektTekst(1)).toBe("1 gegeven ontbreekt voor offertes");
    expect(ontbreektTekst(6)).toBe("6 gegevens ontbreken voor offertes");
  });
});

describe("planKort", () => {
  it("toont plan en of het is opgezegd", () => {
    expect(planKort({ plan: "PRO", status: "ACTIVE" })).toBe("Pro");
    expect(planKort({ plan: "GRATIS", status: "GEEN" })).toBe("Gratis");
    expect(planKort({ plan: "PRO", status: "CANCELED" })).toBe("Pro · opgezegd");
    expect(planKort({ plan: "GRATIS", status: "CANCELED" })).toBe("Gratis");
  });
});
