import type { OfferteRegel } from "@/app/lib/offerte/model";
import type { FactuurInhoud } from "./model";

// Hulpmiddelen voor tests en voorbeelden.
export const AFZENDER_OK = {
  handelsnaam: "Hoveniersbedrijf De Vries",
  rechtsvorm: "EENMANSZAAK" as const,
  statutaireNaam: "",
  statutaireZetel: "",
  kvkNummer: "12345678",
  adresRegel: "Dennenlaan 1",
  postcode: "3511 AB",
  plaats: "Utrecht",
  btwId: "NL123456789B01",
  korActief: false,
  korTekst: "Btw niet van toepassing (kleineondernemersregeling)",
  iban: "NL91 ABNA 0417 1643 00",
  ibanTenaamstelling: "Hoveniersbedrijf De Vries",
  telefoon: "06 12345678",
  email: "jan@devries-hoveniers.nl",
  website: "",
  logoUrl: "",
  contactNaam: "Jan de Vries",
  contactFunctie: "Eigenaar",
  kleur: "#15803d",
  lettertype: "MODERN" as const,
};

export const regel = (id: string, omschrijving: string, aantal: number, prijsCenten: number, btw = 21, extra: Partial<OfferteRegel> = {}): OfferteRegel => ({ id, type: "normaal", omschrijving, aantal, eenheid: "post", prijsCenten, btw, soort: "overig", ...extra });

export function factuurInhoud(opties: { regels?: OfferteRegel[]; soort?: FactuurInhoud["factuur"]["soort"]; zakelijk?: boolean; kor?: boolean; verlegd?: boolean; afzender?: Partial<typeof AFZENDER_OK>; factuurdatum?: string } = {}): FactuurInhoud {
  const regels = opties.regels ?? [regel("r1", "Bestrating", 20, 6500, 21), regel("r2", "Planten", 10, 1200, 9)];
  return {
    nummer: "",
    versie: 1,
    datum: opties.factuurdatum ?? "2026-10-20",
    geldigTot: "2026-11-03",
    afzender: { ...AFZENDER_OK, korActief: opties.kor ?? false, ...opties.afzender },
    klant: { type: opties.zakelijk ? "zakelijk" : "particulier", naam: "A. Jansen", bedrijfsnaam: opties.zakelijk ? "Jansen Bouw BV" : "", adres: { straat: "Kerkstraat 5", postcode: "3512 CD", plaats: "Utrecht" }, email: "a.jansen@example.nl", telefoon: "" },
    projectadresGelijk: true,
    projectadres: { straat: "", postcode: "", plaats: "" },
    onderwerp: "Aanleg tuin",
    introductie: "",
    secties: [{ id: "s1", titel: "Onderdelen", regels }],
    voorwaarden: [],
    herroeping: { aan: false, tekst: "" },
    betaaltermijnen: [],
    planning: { startweek: "", doorlooptijd: "" },
    bijlagen: [],
    slottekst: "",
    rekenregel: 2,
    factuur: {
      soort: opties.soort ?? "factuur",
      nummer: null,
      factuurdatum: opties.factuurdatum ?? "2026-10-20",
      uitvoeringVan: "2026-10-15",
      uitvoeringTot: "",
      vervaldatum: "2026-11-03",
      betaaltermijnDagen: 14,
      offerteNummer: "2026-0012",
      offerteVersie: 1,
      btwModus: opties.verlegd ? "verlegd" : "normaal",
      klantBtwId: opties.verlegd ? "NL987654321B01" : "",
      betaallink: "",
      notitie: "",
    },
  };
}
