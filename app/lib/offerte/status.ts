import type { OfferteV2Status } from "@/app/generated/prisma/client";

export const OFFERTE_V2_STATUS_LABEL: Record<OfferteV2Status, string> = {
  CONCEPT: "Concept",
  VERSTUURD: "Verstuurd",
  BEKEKEN: "Bekeken",
  GEACCEPTEERD: "Geaccepteerd",
  AFGEWEZEN: "Afgewezen",
  VERLOPEN: "Verlopen",
  INGETROKKEN: "Ingetrokken",
};

// Geaccepteerd is definitief vergrendeld: geen nieuwe versie, niet intrekken.
export const isDefinitief = (s: OfferteV2Status) => s === "GEACCEPTEERD";
// Alleen een verstuurde (nog openstaande) of afgewezen/verlopen offerte kan een nieuwe versie krijgen.
export const magNieuweVersie = (s: OfferteV2Status) => s !== "GEACCEPTEERD" && s !== "CONCEPT";
export const magAkkoordGeven = (s: OfferteV2Status) => s === "VERSTUURD" || s === "BEKEKEN";
export const magIntrekken = (s: OfferteV2Status) => s === "VERSTUURD" || s === "BEKEKEN";

// Lazy verval: een openstaande offerte na de geldig-tot-datum telt overal als Verlopen.
export function weergaveStatusV2(o: { status: OfferteV2Status; geldigTot: string | Date }, nu: Date = new Date()): OfferteV2Status {
  if (o.status !== "VERSTUURD" && o.status !== "BEKEKEN") return o.status;
  const tot = typeof o.geldigTot === "string" ? new Date(`${o.geldigTot}T23:59:59`) : o.geldigTot;
  return tot.getTime() < nu.getTime() ? "VERLOPEN" : o.status;
}
