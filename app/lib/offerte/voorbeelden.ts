import { STANDAARD_HERROEPINGSTEKST, STANDAARD_INTRO, STANDAARD_SLOT, STANDAARD_VOORWAARDEN_BLOKKEN, voorwaardenTeksten } from "./gegevens";
import { nieuwId, type OfferteAfzender, type OfferteInhoud, type OfferteRegel, type OfferteSectie } from "./model";

// Voorbeelddocumenten voor de PR, de voorbeeld-PDF's en de schermtests.
const afzender = (o: Partial<OfferteAfzender> = {}): OfferteAfzender => ({
  handelsnaam: "Hoveniersbedrijf De Vries",
  rechtsvorm: "EENMANSZAAK",
  statutaireNaam: "",
  statutaireZetel: "",
  kvkNummer: "12345678",
  adresRegel: "Dennenlaan 12",
  postcode: "3511 AB",
  plaats: "Utrecht",
  btwId: "NL123456789B01",
  korActief: false,
  korTekst: "Btw niet van toepassing (kleineondernemersregeling)",
  iban: "NL91 ABNA 0417 1643 00",
  ibanTenaamstelling: "Hoveniersbedrijf De Vries",
  telefoon: "06 12345678",
  email: "info@devries-hoveniers.nl",
  website: "www.devries-hoveniers.nl",
  logoUrl: "",
  contactNaam: "Jan de Vries",
  contactFunctie: "Eigenaar",
  kleur: "#15803d",
  lettertype: "MODERN",
  ...o,
});

const r = (omschrijving: string, aantal: number, eenheid: string, euro: number, extra: Partial<OfferteRegel> = {}): OfferteRegel => ({
  id: nieuwId(),
  type: "normaal",
  omschrijving,
  aantal,
  eenheid,
  prijsCenten: Math.round(euro * 100),
  btw: 21,
  soort: "overig",
  ...extra,
});
const s = (titel: string, regels: OfferteRegel[]): OfferteSectie => ({ id: nieuwId("s"), titel, regels });

const basis = (o: Partial<OfferteInhoud>): OfferteInhoud => ({
  nummer: "2026-0012",
  versie: 1,
  datum: "2026-10-15",
  geldigTot: "2026-11-14",
  afzender: afzender(),
  klant: { type: "particulier", naam: "Mevrouw A. Jansen", bedrijfsnaam: "", adres: { straat: "Kastanjelaan 8", postcode: "3582 CD", plaats: "Utrecht" }, email: "a.jansen@example.nl", telefoon: "06 87654321" },
  projectadresGelijk: true,
  projectadres: { straat: "", postcode: "", plaats: "" },
  onderwerp: "Aanleg terras en schutting",
  introductie: STANDAARD_INTRO,
  secties: [],
  voorwaarden: voorwaardenTeksten(STANDAARD_VOORWAARDEN_BLOKKEN),
  herroeping: { aan: true, tekst: STANDAARD_HERROEPINGSTEKST },
  betaaltermijnen: [
    { label: "Bij akkoord", percentage: 30 },
    { label: "Na oplevering", percentage: 70 },
  ],
  planning: { startweek: "2026-W46", doorlooptijd: "ongeveer 3 werkdagen" },
  bijlagen: [{ naam: "Algemene voorwaarden.pdf", url: "https://example.nl/av.pdf" }],
  slottekst: STANDAARD_SLOT,
  ...o,
});

export function voorbeeldParticulier(): OfferteInhoud {
  return basis({
    secties: [
      s("Terras – 24 m²", [r("Betonklinker 60×60", 24, "m²", 48.75, { soort: "materiaal" }), r("Straatzand", 4, "m³", 38.5, { soort: "materiaal" }), r("Arbeid", 3.4286, "dagdeel", 180, { soort: "arbeid" }), r("Afvoer grond en puin", 1, "post", 285, { type: "stelpost", soort: "overig", toelichting: "Geschat op basis van 5 m³; wordt op nacalculatie afgerekend." })]),
      s("Haag planten – 12 m", [r("Beuk (Fagus sylvatica) 100-125", 24, "stuks", 14.5, { soort: "planten", btw: 9 }), r("Arbeid", 1, "dagdeel", 180, { soort: "arbeid" }), r("Hagenmest bij planten", 1, "post", 45, { type: "optioneel", soort: "materiaal" })]),
      s("Voorrijkosten en transport", [r("Voorrijkosten", 1, "post", 35, { soort: "transport" }), r("Transport materiaal", 1, "post", 60, { soort: "transport" })]),
    ],
  });
}

export function voorbeeldZakelijk(): OfferteInhoud {
  return basis({
    nummer: "2026-0013",
    klant: { type: "zakelijk", naam: "Pieter Bakker", bedrijfsnaam: "Bakker Vastgoed B.V.", adres: { straat: "Industrieweg 45", postcode: "3542 AD", plaats: "Utrecht" }, email: "p.bakker@bakkervastgoed.nl", telefoon: "030 1234567" },
    projectadresGelijk: false,
    projectadres: { straat: "Parkstraat 3", postcode: "3581 PA", plaats: "Utrecht" },
    onderwerp: "Onderhoud en groenvoorziening binnenplaats",
    herroeping: { aan: false, tekst: STANDAARD_HERROEPINGSTEKST },
    secties: [
      s("Onderhoud – 120 m²", [r("Gazon doorzaaien en bemesten", 120, "m²", 3.85, { soort: "materiaal" }), r("Arbeid", 4, "dagdeel", 180, { soort: "arbeid" }), r("Snoeiwerk heesters", 6, "uur", 55, { soort: "arbeid", kortingPct: 10 })]),
      s("Voorrijkosten en transport", [r("Voorrijkosten", 1, "post", 35, { soort: "transport" })]),
    ],
    betaaltermijnen: [{ label: "Na oplevering", percentage: 100 }],
  });
}

export function voorbeeldKor(): OfferteInhoud {
  return basis({
    nummer: "2026-0014",
    afzender: afzender({ korActief: true, btwId: "", handelsnaam: "Tuinwerk Pieters" }),
    onderwerp: "Tuinonderhoud",
    secties: [s("Tuinonderhoud – 1 dag", [r("Snoeien en opruimen", 8, "uur", 42.5, { soort: "arbeid" }), r("Afvoer snoeiafval", 1, "post", 40, { soort: "overig" })])],
    betaaltermijnen: [{ label: "Na oplevering", percentage: 100 }],
    planning: { startweek: "", doorlooptijd: "" },
  });
}

export function voorbeeldMeerdereKolommen(): OfferteInhoud {
  const regels = Array.from({ length: 22 }, (_, i) => r(`Onderdeel ${i + 1}: ${["Beukenhaag leveren en planten", "Grondverbetering", "Betonband plaatsen", "Gazon aanleggen", "Boomspiegel beplanten"][i % 5]}`, 3 + i, ["m", "m²", "stuks", "m³"][i % 4], 19.95 + i * 3.1, { soort: i % 5 === 0 ? "planten" : "materiaal", btw: i % 5 === 0 ? 9 : 21 }));
  return basis({
    nummer: "2026-0015",
    onderwerp: "Complete tuinaanleg",
    secties: [s("Voorbereiding en grondwerk", regels.slice(0, 8)), s("Beplanting en aanleg", regels.slice(8, 16)), s("Afwerking", regels.slice(16)), s("Voorrijkosten en transport", [r("Voorrijkosten", 1, "post", 35, { soort: "transport" })])],
  });
}

export const VOORBEELDEN = { particulier: voorbeeldParticulier, zakelijk: voorbeeldZakelijk, kor: voorbeeldKor, meerdere: voorbeeldMeerdereKolommen };
