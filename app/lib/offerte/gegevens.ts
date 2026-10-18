import { renderTemplate } from "@/app/lib/sjabloon/render";
import { isGeldigBtwId, isGeldigEmail, isGeldigIban, isGeldigKvk, isGeldigPostcode } from "./validatie";
import type { RegelSoort } from "./btw-config";

export type RechtsvormWaarde = "EENMANSZAAK" | "VOF" | "MAATSCHAP" | "BV" | "NV" | "ANDERS";
export const RECHTSVORM_LABEL: Record<RechtsvormWaarde, string> = {
  EENMANSZAAK: "Eenmanszaak",
  VOF: "Vennootschap onder firma (vof)",
  MAATSCHAP: "Maatschap",
  BV: "Besloten vennootschap (bv)",
  NV: "Naamloze vennootschap (nv)",
  ANDERS: "Anders",
};
export const heeftStatutaireGegevens = (r: RechtsvormWaarde) => r === "BV" || r === "NV";

export const STANDAARD_KOR_TEKST = "Btw niet van toepassing (kleineondernemersregeling)";

export type BetaalTermijn = { label: string; percentage: number };
export const BETAAL_PRESETS = {
  NA_OPLEVERING: { label: "100% na oplevering", termijnen: [{ label: "Na oplevering", percentage: 100 }] },
  AKKOORD_30_70: {
    label: "30% bij akkoord, 70% na oplevering",
    termijnen: [
      { label: "Bij akkoord", percentage: 30 },
      { label: "Na oplevering", percentage: 70 },
    ],
  },
  EIGEN: { label: "Eigen termijnen", termijnen: [{ label: "Na oplevering", percentage: 100 }] },
} as const satisfies Record<string, { label: string; termijnen: readonly BetaalTermijn[] }>;
export type BetaalPreset = keyof typeof BETAAL_PRESETS;

export function termijnenVoor(preset: string, eigen: BetaalTermijn[] | null | undefined): BetaalTermijn[] {
  if (preset === "EIGEN" && eigen && eigen.length > 0) return eigen;
  const p = BETAAL_PRESETS[preset as BetaalPreset];
  return (p ?? BETAAL_PRESETS.NA_OPLEVERING).termijnen.map((t) => ({ ...t }));
}
export const termijnenKloppen = (t: BetaalTermijn[]) => t.length > 0 && Math.abs(t.reduce((s, x) => s + x.percentage, 0) - 100) < 0.001 && t.every((x) => x.percentage > 0 && x.label.trim() !== "");

// Voorwaarden- en uitsluitingenblokken die de hovenier aan/uit kan zetten en kan aanpassen.
export type VoorwaardenBlok = {
  id: "bereikbaarheid" | "afvoer" | "klic" | "meerwerk" | "aanslag" | "weer";
  aan: boolean;
  keuze?: string;
  termijnMaanden?: number;
  tekst?: string; // eigen tekst; leeg = standaardtekst bij de keuze
};

export const VOORWAARDEN_INFO: Record<VoorwaardenBlok["id"], { titel: string; keuzes?: { waarde: string; label: string; tekst: string }[]; tekst?: string }> = {
  bereikbaarheid: { titel: "Bereikbaarheid en grondgesteldheid", tekst: "De prijzen zijn gebaseerd op een normale bereikbaarheid van de werklocatie en een normale grondgesteldheid." },
  afvoer: {
    titel: "Afvoer van grond en puin",
    keuzes: [
      { waarde: "inbegrepen", label: "Inbegrepen", tekst: "Afvoer van vrijkomende grond en puin is bij de prijs inbegrepen." },
      { waarde: "nacalculatie", label: "Op nacalculatie", tekst: "Afvoer van vrijkomende grond en puin wordt op nacalculatie in rekening gebracht." },
      { waarde: "niet", label: "Niet inbegrepen", tekst: "Afvoer van vrijkomende grond en puin is niet bij de prijs inbegrepen." },
    ],
  },
  klic: {
    titel: "KLIC-melding",
    keuzes: [
      { waarde: "door_ons", label: "Door ons", tekst: "De KLIC-melding wordt door ons gedaan." },
      { waarde: "opdrachtgever", label: "Door de opdrachtgever", tekst: "De KLIC-melding wordt door de opdrachtgever gedaan voordat wij beginnen." },
    ],
  },
  meerwerk: { titel: "Meerwerk", tekst: "Meerwerk voeren wij alleen uit na overleg en vooraf schriftelijk akkoord van de opdrachtgever." },
  aanslag: { titel: "Aanslaggarantie planten", tekst: "Op het aanslaan van de geleverde planten geven wij een garantie van {termijn} maanden, mits de verzorgingsinstructies zijn opgevolgd." },
  weer: { titel: "Weersomstandigheden", tekst: "De planning is onder voorbehoud van weersomstandigheden." },
};

export const STANDAARD_VOORWAARDEN_BLOKKEN: VoorwaardenBlok[] = [
  { id: "bereikbaarheid", aan: true },
  { id: "afvoer", aan: true, keuze: "nacalculatie" },
  { id: "klic", aan: true, keuze: "opdrachtgever" },
  { id: "meerwerk", aan: true },
  { id: "aanslag", aan: false, termijnMaanden: 12 },
  { id: "weer", aan: true },
];

export function voorwaardenTeksten(blokken: VoorwaardenBlok[] | null | undefined): string[] {
  return (blokken && blokken.length > 0 ? blokken : STANDAARD_VOORWAARDEN_BLOKKEN)
    .filter((b) => b.aan)
    .map((b) => {
      if (b.tekst && b.tekst.trim()) return b.tekst.trim();
      const info = VOORWAARDEN_INFO[b.id];
      const tekst = info.keuzes ? (info.keuzes.find((k) => k.waarde === b.keuze) ?? info.keuzes[0]).tekst : (info.tekst ?? "");
      return renderTemplate(tekst, { termijn: b.termijnMaanden ?? 12 });
    });
}

// TODO(Pieter): juridisch laten checken.
export const STANDAARD_HERROEPINGSTEKST =
  "Bent u een consument en komt deze overeenkomst op afstand of buiten onze verkoopruimte tot stand, dan heeft u het recht om binnen 14 dagen na het sluiten van de overeenkomst zonder opgave van redenen te herroepen. Wilt u dat wij binnen die termijn met het werk beginnen, dan vragen wij u daar uitdrukkelijk om te verzoeken; herroept u daarna, dan betaalt u ons een evenredig deel voor het reeds verrichte werk. Herroepen kunt u door ons dit schriftelijk of per e-mail te laten weten.";

export const STANDAARD_INTRO = "Hartelijk dank voor uw aanvraag. Hieronder vindt u onze offerte voor het besproken werk.";
export const STANDAARD_SLOT = "Wij vertrouwen erop u hiermee een passend aanbod te hebben gedaan en zien uw reactie graag tegemoet. Heeft u vragen? Neem gerust contact met ons op.";

export type OfferteGegevensWaarden = {
  handelsnaam: string;
  rechtsvorm: RechtsvormWaarde;
  statutaireNaam: string;
  statutaireZetel: string;
  kvkNummer: string;
  adresRegel: string;
  postcode: string;
  plaats: string;
  btwId: string;
  korActief: boolean;
  korTekst: string;
  iban: string;
  ibanTenaamstelling: string;
  telefoon: string;
  email: string;
  website: string;
  logoUrl: string;
  contactNaam: string;
  contactFunctie: string;
  voorwaardenPdfUrl: string;
  voorwaardenPdfNaam: string;
  nummerPrefix: string;
  geldigheidDagen: number;
  betaalPreset: string;
  betaalTermijnen: BetaalTermijn[] | null;
  introTekst: string;
  slotTekst: string;
  voorwaardenBlokken: VoorwaardenBlok[];
  herroepingTekst: string;
  btwStandaard: Partial<Record<RegelSoort, number>> | null;
  deelTekst: string;
  herinneringTekst: string;
  // Facturen.
  factuurPrefix: string;
  creditPrefix: string;
  factuurBetaaltermijnDagen: number;
  factuurDeelTekst: string;
};

export type OntbrekendVeld = { veld: string; label: string; uitleg: string };

// Verplichte gegevens om een offerte te kunnen versturen (wettelijk of praktisch).
export function ontbrekendeVerplichteGegevens(g: Partial<OfferteGegevensWaarden>): OntbrekendVeld[] {
  const o: OntbrekendVeld[] = [];
  const leeg = (v: unknown) => typeof v !== "string" || v.trim() === "";
  if (leeg(g.handelsnaam)) o.push({ veld: "handelsnaam", label: "Handelsnaam", uitleg: "De naam waaronder je werkt." });
  if (leeg(g.kvkNummer) || !isGeldigKvk(g.kvkNummer!)) o.push({ veld: "kvkNummer", label: "KvK-nummer", uitleg: "8 cijfers, verplicht op elke offerte." });
  if (g.rechtsvorm && heeftStatutaireGegevens(g.rechtsvorm)) {
    if (leeg(g.statutaireZetel)) o.push({ veld: "statutaireZetel", label: "Statutaire zetel", uitleg: "De plaats waar je bv of nv statutair gevestigd is." });
  }
  if (leeg(g.adresRegel) || leeg(g.postcode) || leeg(g.plaats) || !isGeldigPostcode(g.postcode ?? "")) {
    o.push({ veld: "adres", label: "Vestigingsadres", uitleg: "Straat en huisnummer, postcode en plaats." });
  }
  if (!g.korActief && (leeg(g.btwId) || !isGeldigBtwId(g.btwId!))) {
    o.push({ veld: "btwId", label: "Btw-id", uitleg: "Formaat NL123456789B01. Gebruik je de kleineondernemersregeling? Zet dan de KOR-schakelaar aan." });
  }
  if (leeg(g.iban) || !isGeldigIban(g.iban!)) o.push({ veld: "iban", label: "IBAN", uitleg: "Waarop je klant betaalt." });
  else if (leeg(g.ibanTenaamstelling)) o.push({ veld: "ibanTenaamstelling", label: "Tenaamstelling IBAN", uitleg: "Op wiens naam staat de rekening?" });
  if (leeg(g.telefoon)) o.push({ veld: "telefoon", label: "Telefoon", uitleg: "Op de offerte en in de voettekst." });
  if (leeg(g.email) || !isGeldigEmail(g.email ?? "")) o.push({ veld: "email", label: "E-mailadres", uitleg: "Hierop kan de klant je bereiken." });
  if (leeg(g.contactNaam)) o.push({ veld: "contactNaam", label: "Contactpersoon", uitleg: "Naam van wie de offerte ondertekent." });
  return o;
}

// Waarschuwingen (geen blokkade).
export function waarschuwingenGegevens(g: Partial<OfferteGegevensWaarden>): string[] {
  const w: string[] = [];
  if (!g.voorwaardenPdfUrl) w.push("Je hebt nog geen algemene voorwaarden geüpload. Een offerte zonder algemene voorwaarden is minder sterk.");
  return w;
}

// Formaatfouten per veld (alleen voor ingevulde velden); leeg opslaan mag, versturen niet.
export function valideerFormaat(g: Partial<OfferteGegevensWaarden>): Record<string, string> {
  const f: Record<string, string> = {};
  if (g.kvkNummer?.trim() && !isGeldigKvk(g.kvkNummer)) f.kvkNummer = "Een KvK-nummer bestaat uit 8 cijfers.";
  if (g.btwId?.trim() && !isGeldigBtwId(g.btwId)) f.btwId = "Een btw-id heeft het formaat NL123456789B01.";
  if (g.iban?.trim() && !isGeldigIban(g.iban)) f.iban = "Dit IBAN klopt niet. Controleer het nummer.";
  if (g.email?.trim() && !isGeldigEmail(g.email)) f.email = "Vul een geldig e-mailadres in.";
  if (g.postcode?.trim() && !isGeldigPostcode(g.postcode)) f.postcode = "Een postcode ziet er zo uit: 1234 AB.";
  if (g.geldigheidDagen != null && (!Number.isInteger(g.geldigheidDagen) || g.geldigheidDagen < 1 || g.geldigheidDagen > 365)) f.geldigheidDagen = "Kies tussen 1 en 365 dagen.";
  if (g.factuurBetaaltermijnDagen != null && (!Number.isInteger(g.factuurBetaaltermijnDagen) || g.factuurBetaaltermijnDagen < 0 || g.factuurBetaaltermijnDagen > 120)) f.factuurBetaaltermijnDagen = "Kies tussen 0 en 120 dagen.";
  if (g.factuurPrefix != null && g.creditPrefix != null && g.factuurPrefix.trim() !== "" && g.factuurPrefix.trim() === g.creditPrefix.trim()) f.creditPrefix = "Gebruik een ander voorvoegsel dan voor facturen.";
  if (g.betaalPreset === "EIGEN" && g.betaalTermijnen && !termijnenKloppen(g.betaalTermijnen)) f.betaalTermijnen = "De termijnen moeten samen 100% zijn.";
  return f;
}
