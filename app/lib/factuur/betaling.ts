import { vandaagAmsterdam } from "@/app/lib/offerte/status";
import type { FactuurStatus } from "@/app/generated/prisma/client";

// Betalingen, openstaand bedrag en "te laat" van een factuur. Puur en in centen; "te laat" wordt afgeleid (tijdzone
// Europe/Amsterdam) en nooit door een achtergrondtaak weggeschreven.

export type BetalingsStand = {
  totaalInclCenten: number;
  betaaldCenten: number;
  // Som van de definitieve creditnota's op deze factuur (positief bedrag).
  gecrediteerdCenten: number;
};

export const openstaandCenten = (s: BetalingsStand) => Math.max(0, s.totaalInclCenten - s.betaaldCenten - s.gecrediteerdCenten);

// De status van een definitieve factuur volgens betalingen en creditnota's. Verstuurd/definitief blijft zoals hij was.
export function statusNaMutatie(huidig: FactuurStatus, s: BetalingsStand, verstuurd: boolean): FactuurStatus {
  if (huidig === "CONCEPT") return "CONCEPT";
  if (s.totaalInclCenten > 0 && s.gecrediteerdCenten >= s.totaalInclCenten) return "GECREDITEERD";
  const open = openstaandCenten(s);
  if (open === 0 && s.totaalInclCenten > 0) return "BETAALD";
  if (s.betaaldCenten > 0) return "DEELS_BETAALD";
  return verstuurd ? "VERSTUURD" : "DEFINITIEF";
}

export type BetalingFout = "bedrag" | "te-hoog" | "geen-factuur" | "datum";

export function valideerBetaling(i: { bedragCenten: number; datum: string }, s: BetalingsStand, status: FactuurStatus): BetalingFout | null {
  if (status === "CONCEPT" || status === "GECREDITEERD") return "geen-factuur";
  if (!Number.isInteger(i.bedragCenten) || i.bedragCenten <= 0) return "bedrag";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.datum)) return "datum";
  if (i.bedragCenten > openstaandCenten(s)) return "te-hoog";
  return null;
}

export const BETALING_FOUT_TEKST: Record<BetalingFout, string> = {
  bedrag: "Vul een bedrag in (groter dan €0).",
  "te-hoog": "Dit is meer dan het openstaande bedrag.",
  "geen-factuur": "Op deze factuur kan geen betaling meer worden geregistreerd.",
  datum: "Kies de datum waarop de betaling binnenkwam.",
};

// Aantal dagen te laat (vervaldatum < vandaag en nog iets openstaand), anders null.
export function dagenTeLaat(f: { vervaldatum: string | Date | null; status: FactuurStatus; openstaandCenten: number }, nu: Date = new Date()): number | null {
  if (!f.vervaldatum || f.openstaandCenten <= 0 || f.status === "CONCEPT" || f.status === "BETAALD" || f.status === "GECREDITEERD") return null;
  const dag = typeof f.vervaldatum === "string" ? f.vervaldatum.slice(0, 10) : f.vervaldatum.toISOString().slice(0, 10);
  const dagen = Math.round((Date.parse(`${vandaagAmsterdam(nu)}T00:00:00Z`) - Date.parse(`${dag}T00:00:00Z`)) / 86_400_000);
  return dagen > 0 ? dagen : null;
}

export type HerinneringStap = "herinnering" | "aanmaning" | "laatste-herinnering";

// De volgende stap: herinnering → aanmaning → (alleen particulieren) laatste herinnering van 14 dagen vóór incassokosten.
export function volgendeHerinnering(verstuurd: { herinneringen: number; aanmaningen: number; laatste: number }, klantType: "particulier" | "zakelijk"): HerinneringStap | null {
  if (verstuurd.herinneringen === 0) return "herinnering";
  if (verstuurd.aanmaningen === 0) return "aanmaning";
  if (klantType === "particulier" && verstuurd.laatste === 0) return "laatste-herinnering";
  return null;
}

export const HERINNERING_LABEL: Record<HerinneringStap, string> = { herinnering: "Herinnering sturen", aanmaning: "Aanmaning sturen", "laatste-herinnering": "Laatste herinnering (14 dagen) sturen" };
