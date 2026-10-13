import type { LeadStatus } from "@/app/generated/prisma/client";
import type { PricingResult } from "@/app/lib/pricing/engine";
import type { PricingInput } from "@/app/lib/pricing/schema";

// Eén regel in een LeadSnapshot — wat de consument had aangevinkt/ingevuld
// voor één dienst of product, bevroren op het moment van aanvragen.
export type LeadSnapshotLine = {
  naam: string;
  type: "dienst" | "product";
  aantal?: number;
  eenheid?: string;
  materiaal?: string;
  extras?: string[];
  // Het volledige, eigen bedrag van dit product (materiaal + arbeid +
  // transport + voorrijkosten van dít product — zie calculate.ts's
  // ProductRegel/calculateBreakdown, dat elk product onafhankelijk
  // doorrekent). Gevuld door de calculator bij het bouwen van de snapshot;
  // gebruikt door prefillOfferteRegels() (offertes.ts) om elke offerteregel
  // zijn eigen, eerlijke prijs per eenheid te geven.
  prijs?: number;
  // Levering B v2 (Deel 12): welk Onderdeel deze regel opleverde — alleen
  // gevuld voor tools die het modulaire Onderdelensysteem gebruiken.
  // Ontbreekt voor v1/System-A-tools (ongewijzigd gedrag).
  onderdeel?: string;
  // Welke werkzaamheid (Product) deze regel opleverde — voor "Bekijk in
  // rekentool" bij een lead. Ontbreekt bij oudere leads en bij Aangepaste tools.
  productId?: string;
  opbouw?: LeadSnapshotOpbouw;
};

// Uitsplitsing van het bedrag van één onderdeel (materiaal, arbeid, transport,
// voorrijkosten, extra's), bevroren zodat een offerte losse regels met de
// echte prijzen kan maken. Bedragen in euro's, excl. btw. Ontbreekt bij
// oudere leads; de offerte valt dan terug op één regel per onderdeel.
export type LeadSnapshotOpbouw = {
  materiaal?: { naam: string; hoeveelheid: number; eenheid?: string; prijsPerEenheid: number; bedrag: number }[];
  // Artikelregels (sjabloon ARTIKELREGELS): één samengesteld bedrag.
  artikelen?: { bedrag: number };
  arbeid?: { tijd: number; eenheid: "uur" | "dagdeel" | "dag"; tarief: number; bedrag: number };
  transport?: { bedrag: number; meeschalend: boolean; dagen?: number };
  voorrijkosten?: { bedrag: number; meeschalend: boolean };
  extras?: { naam: string; aantal: number; bedrag: number }[];
};

// Momentopname van de rekenkern (app/lib/pricing): wat de klant invulde, met welke configuratie er
// is gerekend en de volledige opbouw (regels in centen). De offerte bouwt haar regels hieruit.
export type LeadSnapshotRekenkern = {
  versie: 1;
  // "server": de server heeft opnieuw gerekend uit de invoer en de configuratie van dat moment.
  // "client": de invoer ontbrak (oudere browser, reserve-ingest), de bedragen zijn die van de browser.
  bron: "server" | "client";
  // Vingerafdruk van de PricingConfig waarmee is gerekend (zie app/lib/pricing/hash.ts).
  configHash: string;
  invoer: PricingInput;
  resultaat: PricingResult;
  // Alleen gezet als het servertotaal afwijkt van wat de klant zag (in centen incl. btw).
  afwijking?: { klantCenten: number; serverCenten: number };
};

// Het adres van de klant zoals het bij de aanvraag hoort, met wat het werkgebied ervan vond. Alleen aanwezig als
// de hovenier het werkgebied gebruikt. De server stelt dit zelf vast (zie app/lib/pricing/server.ts).
export type LeadSnapshotLocatie = {
  postcode: string;
  huisnummer: string;
  toevoeging: string;
  straat: string;
  plaats: string;
  lat: number | null;
  lon: number | null;
  afstandKm: number | null;
  // true = binnen, false = buiten, "unknown" = niet te bepalen.
  binnenWerkgebied: boolean | "unknown";
  markeringen: ("BUITEN_WERKGEBIED" | "ONDER_MINIMUM" | "WERKGEBIED_NIET_GECONTROLEERD")[];
  // Het adres is bij PDOK teruggevonden.
  gecontroleerd: boolean;
};

// Vorm van Lead.snapshot (Json). De browser bouwt hem met de rekenkern en stuurt hem mee; de server
// rekent opnieuw uit `rekenkern.invoer` en slaat zijn eigen uitkomst op (zie lead-aanmaken.ts).
export type LeadSnapshot = {
  regels: LeadSnapshotLine[];
  arbeidskosten: number;
  materiaalkosten: number;
  transportkosten: number;
  voorrijkosten: number;
  subtotaal: number;
  btw: number;
  totaal: number;
  // Btw-percentage van de rekentool op het moment van aanvragen.
  btwPercentage?: number;
  // Prijs werd als bandbreedte getoond; de bedragen hierboven zijn het midden.
  bandbreedte?: boolean;
  // Aanwezig bij aanvragen vanaf de rekenkern; oudere snapshots hebben alleen de velden hierboven.
  rekenkern?: LeadSnapshotRekenkern;
  // Idem voor formule-gebaseerde ("Aangepaste") rekentools: de ingevulde waarden, zodat de server kan narekenen.
  // Adres en werkgebied-uitkomst (alleen bij een rekentool met werkgebied of minimum).
  locatie?: LeadSnapshotLocatie;
  // Markeringen ook zonder adres, bijv. "Onder minimum" bij een rekentool met alleen een minimale opdracht.
  markeringen?: LeadSnapshotLocatie["markeringen"];
  modulair?: { versie: 1; bron: "server" | "client"; configHash: string; waarden: Record<string, unknown>; afwijking?: { klantCenten: number; serverCenten: number } };
};

export const LEAD_STATUSSEN: LeadStatus[] = [
  "NIEUW",
  "IN_BEHANDELING",
  "OFFERTE_VERSTUURD",
  "GEWONNEN",
  "VERLOREN",
  "EXTERN_AFGEHANDELD",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NIEUW: "Nieuw",
  IN_BEHANDELING: "In behandeling",
  OFFERTE_VERSTUURD: "Offerte verstuurd",
  GEWONNEN: "Gewonnen",
  VERLOREN: "Verloren",
  EXTERN_AFGEHANDELD: "Extern afgehandeld",
};

// Alles behalve Verloren telt mee in de Pipeline Waarde-KPI — Gewonnen blijft
// meetellen (het is nog steeds verwachte/gerealiseerde omzet uit de pipeline).
export function telItMeeVoorPipeline(status: LeadStatus) {
  return status !== "VERLOREN";
}

// Normaliseert een Nederlands telefoonnummer naar het formaat dat wa.me
// verwacht: alleen cijfers, met landcode, zonder voorloop-nul of +/00.
// "06 12345678" -> "31612345678", "+31 6 12345678" -> "31612345678".
export function normalizeVoorWhatsapp(telefoonnummer: string) {
  let digits = telefoonnummer.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `31${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(telefoonnummer: string) {
  return `https://wa.me/${normalizeVoorWhatsapp(telefoonnummer)}`;
}
