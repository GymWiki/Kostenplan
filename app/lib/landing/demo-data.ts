import { draftNaarBranding, draftNaarKosten, draftNaarProducten, maakDraft } from "@/app/lib/draft-editor";
import type { Draft } from "@/app/lib/draft";
import type { NaarVoorbeeld } from "@/app/voorbeeld/[toolId]/voorbeeld-client";

// Fictieve hoveniersbedrijven voor de demo's op de landingspagina. Ze bestaan
// niet; op de pagina staan ze altijd als "voorbeeld" gemarkeerd. De prijzen en
// werktempo's zijn de voorbeeldwaarden uit de echte presets
// (app/lib/presets/hovenier.ts), dus ook "voorbeeldprijzen".

export type StijlId = "groenhof" | "eikenhoek" | "terlinden" | "standaard";

export type Stijl = {
  id: StijlId;
  naam: string;
  kleur: string;
  achtergrond: string;
  lettertype: "MODERN" | "KLASSIEK" | "VRIENDELIJK" | "STOER";
  letter: string;
  site: string;
  // "standaard" = hoe een Gratis-rekentool eruitziet (zonder eigen huisstijl).
  tier: "GRATIS" | "PRO";
};

export const STIJLEN: Record<StijlId, Stijl> = {
  groenhof: { id: "groenhof", naam: "Groenhof Tuinen", kleur: "#3d6b2e", achtergrond: "#f6f7f1", lettertype: "MODERN", letter: "G", site: "groenhof-tuinen.nl", tier: "PRO" },
  eikenhoek: { id: "eikenhoek", naam: "Eikenhoek Hoveniers", kleur: "#7a4a1e", achtergrond: "#faf6ef", lettertype: "KLASSIEK", letter: "E", site: "eikenhoek-hoveniers.nl", tier: "PRO" },
  terlinden: { id: "terlinden", naam: "Ter Linden Tuinwerken", kleur: "#1d4e89", achtergrond: "#f3f6fa", lettertype: "VRIENDELIJK", letter: "T", site: "terlinden-tuinwerken.nl", tier: "PRO" },
  standaard: { id: "standaard", naam: "Jouw bedrijf", kleur: "#15803d", achtergrond: "#f7faf8", lettertype: "MODERN", letter: "J", site: "jouwbedrijf.nl", tier: "GRATIS" },
};

export const STIJL_IDS = Object.keys(STIJLEN) as StijlId[];

export function logoDataUrl(kleur: string, letter: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#fff"/><text x="32" y="45" font-family="Georgia,serif" font-size="38" font-weight="700" text-anchor="middle" fill="${kleur}">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_PRESETS = ["bestrating", "schutting", "graszoden"];

export function bouwDemoDraft(stijl: Stijl, tarief = 180): Draft {
  const d = maakDraft({
    presetIds: DEMO_PRESETS,
    tarief,
    bedrijfsnaam: stijl.naam,
    logoDataUrl: logoDataUrl(stijl.kleur, stijl.letter),
    kleur: stijl.kleur,
    titel: "Bereken de prijs van jouw project",
    welkomst: "Kies een werkzaamheid en zie direct wat het ongeveer kost.",
    lettertype: stijl.lettertype,
  });
  // Vaste id's: de server rendert de demo vooraf (statisch) en de browser bouwt
  // dezelfde gegevens opnieuw; met willekeurige id's klopt de selectie dan niet meer.
  d.id = "landing-demo";
  d.updatedAt = 1;
  d.calculator.werkzaamheden.forEach((w) => (w.id = `w-${w.presetId}`));
  return d;
}

// Alles wat de rekentool in het iframe nodig heeft, in dezelfde vorm als de
// berichten van de editor (kp:state), voor de eerste render en voor updates.
export function demoToestand(draft: Draft, stijl: Stijl): Omit<NaarVoorbeeld, "type"> {
  const branding = draftNaarBranding(draft);
  return {
    products: draftNaarProducten(draft),
    branding: { ...branding, achtergrondKleur: stijl.achtergrond },
    costSettings: draftNaarKosten(draft),
    modus: "uitproberen",
    geselecteerd: null,
    waarschuwingen: {},
    toelichting: null,
    ctaTekst: null,
    vraagTelefoon: false,
    bedrijfsnaam: draft.company.name,
  };
}
