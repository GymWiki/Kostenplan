// Alle variabelen die een hovenier in een bericht of tekst kan gebruiken, op één plek: {key} in de tekst, een begrijpelijk label, een
// voorbeeldwaarde voor het live voorbeeld en een kleur per groep. Een nieuwe variabele toevoegen = één item in VARIABELEN (en de waarde
// meegeven waar de tekst wordt ingevuld); de editor, het voorbeeld, de kleuren en de controle-test pikken hem vanzelf op.
//
// Opslag blijft een gewone tekst met {key}; renderTemplate (render.ts) vult ze in. Namen hier nooit hernoemen zonder dat bestaande
// teksten blijven werken: nieuwe naam erbij en de oude als `alias` laten staan.

// Waar een tekst wordt ingevuld; bepaalt welke variabelen er bij horen.
export type SjabloonContext = "offerte" | "factuur" | "afwijzing" | "titel" | "voorwaarden";

export type GroepSleutel = "klant" | "document" | "bedrijf" | "bedragen" | "link" | "voorwaarden";

// Kleurfamilie per groep (zie de --chip-* variabelen in globals.css; contrast ≥ 4,5:1 in licht en donker).
export const GROEPEN: Record<GroepSleutel, { label: string; kleur: "blauw" | "paars" | "groen" | "oranje" | "roze" | "turkoois" }> = {
  klant: { label: "Klant", kleur: "blauw" },
  document: { label: "Offerte en factuur", kleur: "paars" },
  bedrijf: { label: "Jouw bedrijf", kleur: "groen" },
  bedragen: { label: "Bedragen en datums", kleur: "oranje" },
  link: { label: "Link", kleur: "roze" },
  voorwaarden: { label: "Voorwaarden", kleur: "turkoois" },
};

export type Variabele = {
  key: string;
  label: string;
  // Voorbeeldwaarde voor het live voorbeeld.
  voorbeeld: string;
  groep: GroepSleutel;
  // In welke teksten de waarde beschikbaar is (daar wordt hij ook echt ingevuld).
  contexten: SjabloonContext[];
  // Korte uitleg voor onder het blokje (tooltip).
  uitleg?: string;
  // Staat dit in een bericht niet, dan tonen we een (niet-blokkerende) waarschuwing.
  verplichtIn?: { context: SjabloonContext; waarschuwing: string }[];
  // Oudere of andere naam voor dezelfde waarde; blijft werken.
  alias?: string;
};

export const VARIABELEN: Variabele[] = [
  { key: "naam", label: "Naam klant", voorbeeld: "Jan de Vries", groep: "klant", contexten: ["offerte", "factuur", "afwijzing"], uitleg: "De naam van je klant. Is die niet bekend, dan staat er “heer/mevrouw”." },
  { key: "nummer", label: "Nummer", voorbeeld: "2026-0042", groep: "document", contexten: ["offerte", "factuur"], uitleg: "Het nummer van de offerte of de factuur." },
  { key: "onderwerp", label: "Onderwerp", voorbeeld: "de aanleg van uw tuin", groep: "document", contexten: ["offerte"], uitleg: "Waar de offerte over gaat, zoals je dat bij de offerte hebt ingevuld." },
  { key: "totaal", label: "Totaalbedrag", voorbeeld: "€ 4.537,97", groep: "bedragen", contexten: ["offerte", "factuur"], uitleg: "Het totaalbedrag, inclusief btw." },
  { key: "geldigTot", label: "Geldig tot", voorbeeld: "15 november 2026", groep: "bedragen", contexten: ["offerte"], uitleg: "De datum tot wanneer de offerte geldt." },
  { key: "vervaldatum", label: "Vervaldatum", voorbeeld: "29 oktober 2026", groep: "bedragen", contexten: ["factuur"], uitleg: "De datum waarop de factuur uiterlijk betaald moet zijn." },
  { key: "iban", label: "IBAN", voorbeeld: "NL91 ABNA 0417 1643 00", groep: "bedrijf", contexten: ["factuur"], uitleg: "Je rekeningnummer, zoals bij je bedrijfsgegevens." },
  { key: "handelsnaam", label: "Bedrijfsnaam", voorbeeld: "Hoveniersbedrijf De Boer", groep: "bedrijf", contexten: ["offerte", "factuur"], uitleg: "De naam van je bedrijf." },
  { key: "contactNaam", label: "Jouw naam", voorbeeld: "Pieter de Boer", groep: "bedrijf", contexten: ["offerte", "factuur"], uitleg: "Je eigen naam als contactpersoon." },
  { key: "bedrijf", label: "Bedrijfsnaam", voorbeeld: "Hoveniersbedrijf De Boer", groep: "bedrijf", contexten: ["afwijzing"], alias: "handelsnaam", uitleg: "De naam van je bedrijf." },
  { key: "bedrijfsnaam", label: "Bedrijfsnaam", voorbeeld: "Hoveniersbedrijf De Boer", groep: "bedrijf", contexten: ["titel"], alias: "handelsnaam", uitleg: "De naam van je bedrijf." },
  {
    key: "link",
    label: "Link naar de offerte of factuur",
    voorbeeld: "https://kostenplan.nl/offerte/Ab3dE5",
    groep: "link",
    contexten: ["offerte", "factuur"],
    uitleg: "Waar je klant het document bekijkt, als pdf downloadt en (bij een offerte) akkoord geeft.",
    verplichtIn: [{ context: "factuur", waarschuwing: "Zonder de link kan je klant de factuur niet bekijken. Sleep het blokje “Link” in je bericht." }],
  },
  { key: "termijn", label: "Termijn in maanden", voorbeeld: "12", groep: "voorwaarden", contexten: ["voorwaarden"], uitleg: "De garantietermijn die je bij deze voorwaarde instelt." },
];

const PER_KEY = new Map(VARIABELEN.map((v) => [v.key, v]));

export const variabeleVoorKey = (key: string): Variabele | undefined => PER_KEY.get(key);

// De variabelen die in deze tekst beschikbaar zijn, in de volgorde van de lijst.
export const variabelenVoor = (context: SjabloonContext): Variabele[] => VARIABELEN.filter((v) => v.contexten.includes(context));

// Gegroepeerd voor de editor: alleen groepen met minstens één variabele.
export function groepenVoor(context: SjabloonContext): { sleutel: GroepSleutel; label: string; kleur: (typeof GROEPEN)[GroepSleutel]["kleur"]; variabelen: Variabele[] }[] {
  const lijst = variabelenVoor(context);
  return (Object.keys(GROEPEN) as GroepSleutel[])
    .map((sleutel) => ({ sleutel, ...GROEPEN[sleutel], variabelen: lijst.filter((v) => v.groep === sleutel) }))
    .filter((g) => g.variabelen.length > 0);
}

// Voorbeeldwaarden van alle variabelen die in deze tekst beschikbaar zijn (voor het live voorbeeld).
export const voorbeeldWaarden = (context: SjabloonContext): Record<string, string> => Object.fromEntries(variabelenVoor(context).map((v) => [v.key, v.voorbeeld]));
