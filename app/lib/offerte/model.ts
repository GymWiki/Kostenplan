import type { BetaalTermijn, OfferteGegevensWaarden } from "./gegevens";
import type { RegelSoort } from "./btw-config";

// Datamodel van een offerte (inhoud van één versie). Alle bedragen in centen
// (gehele getallen), excl. btw; de weergave voor particulieren rekent btw erbij.

export type RegelType = "normaal" | "stelpost" | "optioneel" | "tekst";
export const REGEL_TYPE_LABEL: Record<RegelType, string> = {
  normaal: "Normaal",
  stelpost: "Stelpost",
  optioneel: "Optioneel",
  tekst: "Tekstregel",
};

export type OfferteRegel = {
  id: string;
  type: RegelType;
  omschrijving: string;
  // Hoeveelheid met maximaal 4 decimalen (arbeid in dagdelen, bijv. 7,3333).
  aantal: number;
  eenheid: string;
  prijsCenten: number;
  // Btw-percentage van deze regel (21, 9 of 0), uit de configuratie.
  btw: number;
  soort: RegelSoort;
  // Optionele korting in procenten (0-100).
  kortingPct?: number;
  // Toelichting onder de regel (bijv. "geschat, op nacalculatie").
  toelichting?: string;
};

export type OfferteSectie = {
  id: string;
  titel: string;
  // Onderdeel uit de rekentool waar deze sectie uit voortkomt.
  productId?: string;
  regels: OfferteRegel[];
};

export type KlantType = "particulier" | "zakelijk";

export type Adres = { straat: string; postcode: string; plaats: string };

export type OfferteKlant = {
  type: KlantType;
  naam: string;
  bedrijfsnaam: string;
  adres: Adres;
  email: string;
  telefoon: string;
};

export type OffertePlanning = {
  // ISO-weekaanduiding "2026-W20" of vrije tekst; leeg = niet ingevuld.
  startweek: string;
  doorlooptijd: string;
};

export type OfferteBijlage = { naam: string; url: string };

// Bedrijfsgegevens zoals ze op het moment van opstellen waren: een verstuurde
// versie blijft zo altijd gelijk aan wat de klant ontving.
export type OfferteAfzender = Pick<
  OfferteGegevensWaarden,
  | "handelsnaam"
  | "rechtsvorm"
  | "statutaireNaam"
  | "statutaireZetel"
  | "kvkNummer"
  | "adresRegel"
  | "postcode"
  | "plaats"
  | "btwId"
  | "korActief"
  | "korTekst"
  | "iban"
  | "ibanTenaamstelling"
  | "telefoon"
  | "email"
  | "website"
  | "logoUrl"
  | "contactNaam"
  | "contactFunctie"
> & { kleur: string; lettertype: string };

export type OfferteInhoud = {
  nummer: string;
  versie: number;
  datum: string; // ISO yyyy-mm-dd
  geldigTot: string; // ISO yyyy-mm-dd
  afzender: OfferteAfzender;
  klant: OfferteKlant;
  projectadresGelijk: boolean;
  projectadres: Adres;
  onderwerp: string;
  introductie: string;
  secties: OfferteSectie[];
  voorwaarden: string[];
  herroeping: { aan: boolean; tekst: string };
  betaaltermijnen: BetaalTermijn[];
  planning: OffertePlanning;
  bijlagen: OfferteBijlage[];
  slottekst: string;
  // Alleen van belang voor de hovenier: afwijking t.o.v. de berekening in de rekentool.
  bron?: { leadId: string; totaalRekentoolInclCenten: number; bandbreedte?: boolean };
};

export const leegAdres = (): Adres => ({ straat: "", postcode: "", plaats: "" });

let teller = 0;
export function nieuwId(voorvoegsel = "r"): string {
  teller += 1;
  return `${voorvoegsel}${Date.now().toString(36)}${teller.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const heeftBedrag = (r: OfferteRegel) => r.type !== "tekst";
