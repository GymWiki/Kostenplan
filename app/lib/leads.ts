import type { LeadStatus } from "@/app/generated/prisma/client";

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
};

// Vorm van Lead.snapshot (Json). Gebouwd client-side in de publieke
// calculator (die de volledige, leesbare namen al in context heeft) en
// ongewijzigd opgeslagen — dit is een prijsindicatie voor de consument,
// geen factuur, dus er is geen noodzaak dit server-side te herberekenen.
export type LeadSnapshot = {
  regels: LeadSnapshotLine[];
  arbeidskosten: number;
  materiaalkosten: number;
  transportkosten: number;
  voorrijkosten: number;
  subtotaal: number;
  btw: number;
  totaal: number;
};

export const LEAD_STATUSSEN: LeadStatus[] = [
  "NIEUW",
  "IN_BEHANDELING",
  "OFFERTE_VERSTUURD",
  "GEWONNEN",
  "VERLOREN",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NIEUW: "Nieuw",
  IN_BEHANDELING: "In behandeling",
  OFFERTE_VERSTUURD: "Offerte verstuurd",
  GEWONNEN: "Gewonnen",
  VERLOREN: "Verloren",
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
