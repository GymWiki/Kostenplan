import type { ArbeidStapEenheid, ProductSjabloon } from "@/app/generated/prisma/client";
import { HOVENIER_PRESETS } from "./hovenier";
import type { HovenierPreset, Rekenmethode } from "./types";

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

// TODO(Pieter): bevestig deze omrekening (1 dag = 2 dagdelen = 8 uur).
const DAGDELEN_PER_DAG = 2;
const UREN_PER_DAG = 8;

// Presets staan "per dag"; de hovenier kiest zelf in de kosteninstellingen
// of hij in uur/dagdeel/dag rekent (CostSettings.arbeidStapEenheid). Dit
// rekent de standaardproductiviteit om naar die gekozen eenheid.
export function productiviteitVoorStapEenheid(
  preset: HovenierPreset,
  stapEenheid: ArbeidStapEenheid
): number {
  const factor =
    stapEenheid === "DAG" ? 1 : stapEenheid === "DAGDEEL" ? 1 / DAGDELEN_PER_DAG : 1 / UREN_PER_DAG;
  return Math.round(preset.productiviteitPerDag * factor * 100) / 100;
}

// Formulierwaarden voor createProductDraftAction/updateProductDraftAction
// (zelfde velden als de huidige wizard — zie bouwProductFormData).
export function presetNaarProductFormData(
  preset: HovenierPreset,
  stapEenheid: ArbeidStapEenheid
): FormData {
  const fd = new FormData();
  fd.set("naam", preset.naam);
  fd.set("eenheid", preset.eenheid);
  fd.set("sjabloon", REKENMETHODE_SJABLOON[preset.rekenmethode]);
  fd.set("sjabloonConfig", JSON.stringify({}));
  fd.set("productiviteit", String(productiviteitVoorStapEenheid(preset, stapEenheid)));
  fd.set("icoon", preset.icoon);
  fd.set("omschrijving", preset.uitleg);
  fd.set("actief", "on");
  return fd;
}
