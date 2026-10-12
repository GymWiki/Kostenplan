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
export const magIntrekken = (s: OfferteV2Status) => s === "VERSTUURD" || s === "BEKEKEN";
// Zolang de offerte openstaat (of nog als concept is gedeeld) kan de klant reageren; of dat nu nog
// mag hangt ook af van de geldigheidsdatum, zie magNuAkkoordGeven().
export const staatOpenVoorReactie = (s: OfferteV2Status) => s === "VERSTUURD" || s === "BEKEKEN";

const AMSTERDAM = "Europe/Amsterdam";

// De datum van vandaag in Nederland (yyyy-mm-dd), ongeacht in welke tijdzone de server draait.
export function vandaagAmsterdam(nu: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: AMSTERDAM, year: "numeric", month: "2-digit", day: "2-digit" }).format(nu);
}

// geldig_tot is een datum (yyyy-mm-dd, of een Date uit de database): de offerte is geldig t/m die dag.
export function isVerlopen(geldigTot: string | Date, nu: Date = new Date()): boolean {
  const dag = typeof geldigTot === "string" ? geldigTot.slice(0, 10) : geldigTot.toISOString().slice(0, 10);
  return vandaagAmsterdam(nu) > dag;
}

// Verval wordt afgeleid, nooit door een achtergrondtaak weggeschreven: een openstaande
// offerte na de geldig-tot-datum telt overal als Verlopen.
export function weergaveStatusV2(o: { status: OfferteV2Status; geldigTot: string | Date | null }, nu: Date = new Date()): OfferteV2Status {
  if (o.status !== "VERSTUURD" && o.status !== "BEKEKEN") return o.status;
  return o.geldigTot && isVerlopen(o.geldigTot, nu) ? "VERLOPEN" : o.status;
}

// Server-side controle bij akkoord geven: alleen een openstaande, niet-verlopen offerte.
export function magNuAkkoordGeven(o: { status: OfferteV2Status; geldigTot: string | Date | null }, nu: Date = new Date()): { ok: true } | { ok: false; reden: "verlopen" | "gesloten" } {
  if (!staatOpenVoorReactie(o.status)) return { ok: false, reden: "gesloten" };
  if (o.geldigTot && isVerlopen(o.geldigTot, nu)) return { ok: false, reden: "verlopen" };
  return { ok: true };
}

// Wanneer verdient een openstaande offerte een herinnering? Binnen 3 dagen vóór het verlopen, of
// 7 dagen of langer verstuurd zonder reactie. Alleen een tip voor de hovenier; er wordt niets
// automatisch verstuurd.
export type HerinneringReden = "verloopt-binnenkort" | "geen-reactie";
export function herinneringNodig(o: { status: OfferteV2Status; geldigTot: string | Date | null; verstuurdOp: Date | null }, nu: Date = new Date()): HerinneringReden | null {
  if (!staatOpenVoorReactie(o.status) || !o.geldigTot || isVerlopen(o.geldigTot, nu)) return null;
  const dag = typeof o.geldigTot === "string" ? o.geldigTot.slice(0, 10) : o.geldigTot.toISOString().slice(0, 10);
  const dagen = Math.round((Date.parse(`${dag}T00:00:00Z`) - Date.parse(`${vandaagAmsterdam(nu)}T00:00:00Z`)) / 86_400_000);
  if (dagen <= 3) return "verloopt-binnenkort";
  if (o.verstuurdOp && nu.getTime() - o.verstuurdOp.getTime() >= 7 * 86_400_000) return "geen-reactie";
  return null;
}
