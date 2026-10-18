import type { ArbeidStapEenheid, ProductSjabloon } from "@/app/generated/prisma/client";
import { STANDAARD_UREN, convertWerktempo, type UrenConfig } from "@/app/lib/werktempo";
import { HOVENIER_PRESETS } from "./hovenier";
import type { HovenierPreset, Rekenmethode } from "./types";
import type { Methode, WerkzaamheidDraft } from "@/app/lib/werkzaamheid";

export { HOVENIER_PRESETS, VOORBEELD_LABEL } from "./hovenier";
export type { HovenierPreset, PresetMateriaal, Rekenmethode } from "./types";

// Rekenmethode → bestaand ProductSjabloon. Geen nieuwe rekenlogica: de
// engine in calculate.ts / sjablonen.ts blijft ongewijzigd.
export const REKENMETHODE_SJABLOON: Record<Rekenmethode, ProductSjabloon> = {
  m2: "ENKELE_HOEVEELHEID",
  "strekkende-meter": "ENKELE_HOEVEELHEID",
  "lengte-breedte": "AFMETINGEN",
  stuks: "ENKELE_HOEVEELHEID",
};

export function presetById(id: string): HovenierPreset | undefined {
  return HOVENIER_PRESETS.find((p) => p.id === id);
}


// Presets staan "per dag"; de hovenier kiest zelf in de kosteninstellingen
// of hij in uur/dagdeel/dag rekent (CostSettings.arbeidStapEenheid). Dit
// rekent de standaardproductiviteit om naar die gekozen eenheid.
export function productiviteitVoorStapEenheid(
  preset: HovenierPreset,
  stapEenheid: ArbeidStapEenheid,
  uren: UrenConfig = STANDAARD_UREN
): number {
  return Math.round(convertWerktempo(preset.productiviteitPerDag, "DAG", stapEenheid, uren) * 100) / 100;
}

// "Eigen werkzaamheid": de uitweg voor alles wat niet in de presets staat.
// Zelfde mechanisme als een preset, maar met een lege (naamloze) start.
export const EIGEN_WERKZAAMHEID: HovenierPreset = {
  id: "eigen",
  naam: "Eigen onderdeel",
  icoon: "Shovel",
  rekenmethode: "m2",
  eenheid: "m2",
  materialen: [{ naam: "Materiaal", prijs: 0 }],
  productiviteitPerDag: 0,
  productiviteitVraag: "Hoeveel m² doe je per dag?",
  voorbeeldHoeveelheid: 20,
  uitleg: "Iets anders? Stel je eigen onderdeel in.",
};

// De wizardvraag staat in de preset "per dag"; hier in de eenheid waarin de
// hovenier zijn arbeid rekent.
export function productiviteitVraagVoor(
  preset: HovenierPreset,
  stapEenheid: ArbeidStapEenheid
): string {
  const woord = stapEenheid === "DAG" ? "dag" : stapEenheid === "DAGDEEL" ? "dagdeel" : "uur";
  return preset.productiviteitVraag.replace(/per dag\?$/, `per ${woord}?`);
}

// Formulierwaarden voor createProductDraftAction/updateProductDraftAction
// (zelfde velden als de huidige wizard — zie bouwProductFormData).
// `productiviteit`: undefined = de standaard van de preset, null = geen
// arbeidstijd (veld weglaten).
export function presetNaarProductFormData(
  preset: HovenierPreset,
  stapEenheid: ArbeidStapEenheid,
  opties: { naam?: string; productiviteit?: number | null } = {}
): FormData {
  const fd = new FormData();
  fd.set("naam", opties.naam ?? preset.naam);
  fd.set("eenheid", preset.eenheid);
  fd.set("sjabloon", REKENMETHODE_SJABLOON[preset.rekenmethode]);
  fd.set("sjabloonConfig", JSON.stringify({}));
  const productiviteit =
    opties.productiviteit === undefined
      ? productiviteitVoorStapEenheid(preset, stapEenheid)
      : opties.productiviteit;
  if (productiviteit != null && productiviteit > 0) fd.set("productiviteit", String(productiviteit));
  fd.set("icoon", preset.icoon);
  fd.set("omschrijving", preset.id === "eigen" ? "" : preset.uitleg);
  fd.set("actief", "on");
  return fd;
}

// Productlimiet van het abonnement: de eerste `ruimte` presets worden
// aangemaakt, de rest komt terug als upgrade-suggestie. `ruimte` null =
// onbeperkt.
export function verdeelOverRuimte<T>(items: T[], ruimte: number | null): { aanmaken: T[]; over: T[] } {
  if (ruimte === null) return { aanmaken: items, over: [] };
  const n = Math.max(0, ruimte);
  return { aanmaken: items.slice(0, n), over: items.slice(n) };
}

const REKENMETHODE_NAAR_METHODE: Record<Rekenmethode, Methode> = {
  m2: "M2",
  "strekkende-meter": "METER",
  "lengte-breedte": "LENGTE_BREEDTE",
  stuks: "STUK",
};

// Startpunt van de wizard: de preset als WerkzaamheidDraft, met voorbeeldprijzen
// (isVoorbeeld) en het werktempo omgerekend naar de arbeidseenheid van de
// hovenier. "Iets anders" (eigen) begint leeg.
export function presetNaarDraft(preset: HovenierPreset, stapEenheid: ArbeidStapEenheid, uren: UrenConfig = STANDAARD_UREN): WerkzaamheidDraft {
  const eigen = preset.id === EIGEN_WERKZAAMHEID.id;
  const tempo = eigen ? 0 : productiviteitVoorStapEenheid(preset, stapEenheid, uren);
  return {
    naam: eigen ? "" : preset.naam,
    methode: eigen ? null : REKENMETHODE_NAAR_METHODE[preset.rekenmethode],
    productiviteit: tempo > 0 ? String(tempo) : "",
    transportPerDag: false,
    bandbreedte: false,
    werktempoPerMateriaal: false,
    materialen: preset.materialen.map((m, i) => ({
      sleutel: `preset-${i}`,
      naam: eigen ? "" : m.naam,
      prijs: eigen ? "" : String(m.prijs),
      prijsMin: eigen ? "" : String(m.prijs),
      prijsMax: eigen ? "" : String(m.prijs),
      productiviteitOverride: "",
      isVoorbeeld: !eigen,
    })),
  };
}
