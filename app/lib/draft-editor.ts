import { convertTarief } from "@/app/lib/werktempo";
import { HOVENIER_PRESETS, presetById, presetNaarDraft, type HovenierPreset } from "@/app/lib/presets";
import { bouwPreviewProduct, type ProductMetRelaties, type WerkzaamheidDraft } from "@/app/lib/werkzaamheid";
import { nieuweId } from "@/app/lib/draft-id";
import type { Draft, DraftWerkzaamheid } from "@/app/lib/draft";
import type { Branding, CostSettings } from "@/app/generated/prisma/client";

// Vertaalt het browser-concept naar de gegevens die de editor al kent, zodat
// dezelfde editor en dezelfde klant-rekentool het kunnen tonen.
export const GAST_TOOL_ID = "gast-voorbeeld";
export const STANDAARD_KLEUR = "#15803d";

export function draftNaarProducten(draft: Draft): ProductMetRelaties[] {
  return draft.calculator.werkzaamheden.map((w, i) => {
    const preset = w.presetId ? presetById(w.presetId) : undefined;
    const p = bouwPreviewProduct({
      toolId: GAST_TOOL_ID,
      draft: w.draft as WerkzaamheidDraft,
      icoon: preset?.icoon ?? w.icoon ?? null,
      omschrijving: preset?.uitleg ?? null,
    });
    const cid = `c-${w.id}`;
    return {
      ...p,
      id: w.id,
      order: i,
      actief: w.actief,
      materiaalCategorieen: p.materiaalCategorieen.map((c) => ({
        ...c,
        id: cid,
        productId: w.id,
        // Eigen id per materiaal binnen dit onderdeel, ook voor nieuwe rijen.
        materialen: c.materialen.map((m) => ({ ...m, id: m.id.startsWith("voorbeeld-") ? `${w.id}-${m.id.slice(10)}` : m.id, materialCategoryId: cid })),
      })),
      extraOpties: p.extraOpties.map((e) => ({ ...e, id: e.id.startsWith("voorbeeld-extra-") ? `${w.id}-${e.id.slice(16)}` : e.id, productId: w.id })),
    } as ProductMetRelaties;
  });
}

export function draftNaarBranding(draft: Draft): Branding {
  return {
    id: "gast-branding",
    toolId: GAST_TOOL_ID,
    logoUrl: draft.company.logoDataUrl ?? null,
    primaireKleur: draft.company.colors.primair,
    achtergrondKleur: draft.company.colors.achtergrond ?? "#f7faf8",
    lettertype: draft.company.lettertype ?? "MODERN",
    customTitel: draft.company.titel ?? null,
    welkomstTekst: draft.company.welkomst ?? null,
    bedankTekst: "Bedankt voor je aanvraag! Wij nemen binnen 24 uur contact met je op.",
    toonTelefoonnummer: false,
    telefoonnummer: null,
    toonEmail: false,
    contactPositie: "BOVENAAN",
    offerteIntroTekst: null,
    offerteVoorwaardenTekst: null,
    offerteGeldigheidsdagen: 30,
    updatedAt: new Date(0),
  } as unknown as Branding;
}

export function draftNaarKosten(draft: Draft): CostSettings {
  return {
    id: "gast-kosten",
    toolId: GAST_TOOL_ID,
    arbeidEnabled: true,
    arbeidZichtbaar: true,
    arbeidStapEenheid: "DAGDEEL",
    gebruiktAccountArbeidTarief: false,
    arbeidTariefUur: Math.round(convertTarief(draft.tarieven.tarief, "DAGDEEL", "UUR") * 100) / 100,
    arbeidTariefDagdeel: draft.tarieven.tarief,
    arbeidTariefDag: convertTarief(draft.tarieven.tarief, "DAGDEEL", "DAG"),
    arbeidAfronden: false,
    transportEnabled: true,
    transportZichtbaar: true,
    transportTarief: draft.tarieven.transport,
    voorrijEnabled: true,
    voorrijZichtbaar: true,
    gebruiktAccountVoorrijTarief: false,
    voorrijTarief: draft.tarieven.voorrijkosten,
    materiaalEnabled: true,
    materiaalZichtbaar: true,
    gebruiktAccountBtw: false,
    btwPercentage: 21,
    bandbreedteModus: "GEEN",
    bandbreedteMargeOmlaag: 10,
    bandbreedteMargeOmhoog: 10,
  } as unknown as CostSettings;
}

export function presetNaarDraftWerkzaamheid(preset: HovenierPreset): DraftWerkzaamheid {
  return { id: `w-${nieuweId().slice(0, 12)}`, actief: true, icoon: preset.icoon, presetId: preset.id, draft: presetNaarDraft(preset, "DAGDEEL") as DraftWerkzaamheid["draft"] };
}

// Het begin van een concept, uit het /probeer-formulier.
export function maakDraft(invoer: {
  presetIds: string[];
  tarief: number;
  bedrijfsnaam?: string;
  logoDataUrl?: string;
  kleur?: string;
  titel?: string;
  welkomst?: string;
  lettertype?: "MODERN" | "KLASSIEK" | "VRIENDELIJK" | "STOER";
}): Draft {
  // Bestrating eerst: de rekentool toont het eerste onderdeel meteen met een voorbeeldhoeveelheid.
  const presets = HOVENIER_PRESETS.filter((p) => invoer.presetIds.includes(p.id)).sort((a, b) => Number(b.id === "bestrating") - Number(a.id === "bestrating"));
  return {
    version: 1,
    id: nieuweId(),
    updatedAt: Date.now(),
    company: {
      name: invoer.bedrijfsnaam?.trim() || "Mijn hoveniersbedrijf",
      ...(invoer.logoDataUrl ? { logoDataUrl: invoer.logoDataUrl } : {}),
      colors: { primair: invoer.kleur ?? STANDAARD_KLEUR },
      ...(invoer.titel ? { titel: invoer.titel } : {}),
      ...(invoer.welkomst ? { welkomst: invoer.welkomst } : {}),
      ...(invoer.lettertype ? { lettertype: invoer.lettertype } : {}),
    },
    tarieven: { tarief: invoer.tarief, voorrijkosten: 35, transport: 0 },
    calculator: { name: "Mijn rekentool", werkzaamheden: presets.map(presetNaarDraftWerkzaamheid) },
  };
}
