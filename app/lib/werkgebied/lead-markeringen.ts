import type { LeadSnapshot } from "@/app/lib/leads";
import { LABEL_BUITEN_WERKGEBIED, LABEL_NIET_GECONTROLEERD, LABEL_ONDER_MINIMUM } from "./teksten";

// Wat een lead aan werkgebied-markeringen heeft, voor labels en het filter in Leads.
export type MarkeringSoort = "BUITEN_WERKGEBIED" | "ONDER_MINIMUM" | "WERKGEBIED_NIET_GECONTROLEERD";

export const MARKERING_LABELS: Record<MarkeringSoort, string> = {
  BUITEN_WERKGEBIED: LABEL_BUITEN_WERKGEBIED,
  ONDER_MINIMUM: LABEL_ONDER_MINIMUM,
  WERKGEBIED_NIET_GECONTROLEERD: LABEL_NIET_GECONTROLEERD,
};

export const MARKERING_FILTER_OPTIES: { waarde: string; label: string; soort: MarkeringSoort | null }[] = [
  { waarde: "alle", label: "Alle leads", soort: null },
  { waarde: "buiten", label: LABEL_BUITEN_WERKGEBIED, soort: "BUITEN_WERKGEBIED" },
  { waarde: "minimum", label: LABEL_ONDER_MINIMUM, soort: "ONDER_MINIMUM" },
  { waarde: "niet-gecontroleerd", label: LABEL_NIET_GECONTROLEERD, soort: "WERKGEBIED_NIET_GECONTROLEERD" },
];

export function leadMarkeringen(snapshot: Pick<LeadSnapshot, "locatie" | "markeringen">): MarkeringSoort[] {
  return snapshot.locatie?.markeringen ?? snapshot.markeringen ?? [];
}

// "12,3 km" als de afstand bekend is.
export function afstandTekst(snapshot: Pick<LeadSnapshot, "locatie">): string | null {
  const km = snapshot.locatie?.afstandKm;
  return typeof km === "number" ? `${km.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km` : null;
}
