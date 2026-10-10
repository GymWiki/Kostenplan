import type { ArbeidStapEenheid, ProductSjabloon } from "@/app/generated/prisma/client";

// Hoe de klant tot een hoeveelheid komt, in hoveniertaal. Elke rekenmethode
// wijst naar een BESTAAND ProductSjabloon + eenheid (zie REKENMETHODE_MAPPING
// in index.ts) — presets voegen dus geen nieuwe rekenlogica toe.
export type Rekenmethode = "m2" | "strekkende-meter" | "lengte-breedte" | "stuks";

export type PresetMateriaal = {
  naam: string;
  // Prijs per eenheid van de preset (bijv. per m²), incl. jouw marge.
  prijs: number;
};

export type HovenierPreset = {
  id: string;
  naam: string;
  // Naam van een icoon uit PRODUCT_ICONS (app/lib/icons.ts).
  icoon: string;
  rekenmethode: Rekenmethode;
  // Opgeslagen eenheid (Product.eenheid): "m1", "m2" of "stuks".
  eenheid: string;
  materialen: PresetMateriaal[];
  // Standaardproductiviteit: aantal `eenheid` per dag. Wordt omgerekend naar
  // dagdeel/uur als de hovenier daar voor kiest (zie productiviteitVoorStapEenheid).
  productiviteitPerDag: number;
  // Vraag in de wizard, bijv. "Hoeveel m² leg je per dag?"
  productiviteitVraag: string;
  // Realistische klantinvoer voor het live rekenvoorbeeld (in `eenheid`).
  voorbeeldHoeveelheid: number;
  // Korte uitleg op de kaart (max ~1 zin).
  uitleg: string;
};

export type PresetRekenInstelling = {
  sjabloon: ProductSjabloon;
  stapEenheid?: ArbeidStapEenheid;
};
