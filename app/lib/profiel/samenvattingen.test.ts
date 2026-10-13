import { describe, expect, it } from "vitest";
import { abonnementRegel, domeinVan, initialen, werkgebiedRegel } from "./samenvattingen";
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
    expect(abonnementRegel({ ...basis, plan: "GRATIS", status: "GEEN" }).tekst).toBe("Gratis · 2 van 3 onderdelen gebruikt");
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
    expect(werkgebiedRegel(i)).toBe("25 km rond Zwolle · vanaf €250");
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
