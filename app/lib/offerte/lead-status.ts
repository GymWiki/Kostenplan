import type { OfferteV2Status } from "@/app/generated/prisma/client";
import { OFFERTE_V2_STATUS_LABEL, weergaveStatusV2 } from "./status";

// Offertestatus van een lead voor het overzicht (labels en filter), voor nieuwe en oude offertes.
export type LeadOfferteStatusSleutel = "geen" | "concept" | "verstuurd" | "bekeken" | "geaccepteerd" | "afgewezen" | "verlopen" | "ingetrokken";

export const OFFERTE_FILTER_OPTIES: { waarde: "alle" | LeadOfferteStatusSleutel; label: string }[] = [
  { waarde: "alle", label: "Alle offertes" },
  { waarde: "geen", label: "Nog geen offerte" },
  { waarde: "concept", label: "Concept" },
  { waarde: "verstuurd", label: "Verstuurd" },
  { waarde: "bekeken", label: "Bekeken" },
  { waarde: "geaccepteerd", label: "Geaccepteerd" },
  { waarde: "afgewezen", label: "Afgewezen" },
  { waarde: "verlopen", label: "Verlopen" },
];

type LeadMetOfferte = { offerte: { status: string; geldigTot: Date | null; v2Status?: OfferteV2Status } | null };

export function leadOfferteStatus(lead: LeadMetOfferte, nu: Date = new Date()): { sleutel: LeadOfferteStatusSleutel; label: string } {
  const o = lead.offerte;
  if (!o) return { sleutel: "geen", label: "Geen offerte" };
  const v2 = o.v2Status ? weergaveStatusV2({ status: o.v2Status, geldigTot: o.geldigTot ?? new Date(8.64e15) }, nu) : null;
  const s = v2 ?? (o.status === "VERSTUURD" && o.geldigTot && o.geldigTot.getTime() < nu.getTime() ? "VERLOPEN" : o.status);
  const sleutel = String(s).toLowerCase() as LeadOfferteStatusSleutel;
  const labelV2 = OFFERTE_V2_STATUS_LABEL[s as OfferteV2Status];
  return { sleutel, label: labelV2 ?? String(s) };
}
