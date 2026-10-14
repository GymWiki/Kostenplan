import { WEERGAVE_LABEL, type Weergave } from "./config";

// Statistiek per rekentool voor het Rekentools-overzicht: bezoekers, toevoegingen en aanvragen van de laatste 30 dagen, en per
// weergave en plaatsing naast elkaar, zodat de hovenier ziet welke weergave voor hem werkt. Alleen tellingen, geen persoonsgegevens.

export type StatRij = { toolId: string; type: string; weergave: string | null; plaatsing: string | null; aantal: number };

export type WeergaveStat = { sleutel: string; label: string; bezoekers: number; toevoegingen: number; aanvragen: number };
export type ToolStatistiek = { bezoekers: number; toevoegingen: number; aanvragen: number; perWeergave: WeergaveStat[] };

const leeg = (): ToolStatistiek => ({ bezoekers: 0, toevoegingen: 0, aanvragen: 0, perWeergave: [] });

export function weergaveLabel(weergave: string, plaatsing: string | null): string {
  const w = (WEERGAVE_LABEL as Record<string, string>)[weergave] ?? weergave;
  return plaatsing === "popup" ? `${w}, pop-up` : `${w}, in de pagina`;
}

// De totalen tellen bezoeken (VISIT), toevoegingen (ONDERDEEL_TOEGEVOEGD) en aanvragen (LEAD, door de server vastgelegd). Per
// weergave telt de rekentool zelf mee, en alleen metingen die weten hoe de rekentool eruitzag.
export function bouwStatistiek(rijen: readonly StatRij[]): Map<string, ToolStatistiek> {
  const perTool = new Map<string, ToolStatistiek>();
  const perWeergave = new Map<string, Map<string, WeergaveStat>>();
  for (const r of rijen) {
    const t = perTool.get(r.toolId) ?? leeg();
    perTool.set(r.toolId, t);
    if (r.type === "VISIT") t.bezoekers += r.aantal;
    else if (r.type === "ONDERDEEL_TOEGEVOEGD") t.toevoegingen += r.aantal;
    else if (r.type === "LEAD") t.aanvragen += r.aantal;
    if (!r.weergave || !["VISIT", "ONDERDEEL_TOEGEVOEGD", "AANVRAAG_VERSTUURD"].includes(r.type)) continue;
    const sleutel = `${r.weergave}|${r.plaatsing ?? "inline"}`;
    const rijenVanTool = perWeergave.get(r.toolId) ?? new Map<string, WeergaveStat>();
    perWeergave.set(r.toolId, rijenVanTool);
    const w = rijenVanTool.get(sleutel) ?? { sleutel, label: weergaveLabel(r.weergave, r.plaatsing), bezoekers: 0, toevoegingen: 0, aanvragen: 0 };
    rijenVanTool.set(sleutel, w);
    if (r.type === "VISIT") w.bezoekers += r.aantal;
    else if (r.type === "ONDERDEEL_TOEGEVOEGD") w.toevoegingen += r.aantal;
    else w.aanvragen += r.aantal;
  }
  for (const [toolId, rijenVanTool] of perWeergave) perTool.get(toolId)!.perWeergave = [...rijenVanTool.values()].sort((a, b) => b.bezoekers - a.bezoekers || a.label.localeCompare(b.label));
  return perTool;
}

export type { Weergave };
