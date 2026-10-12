import type { CalcCostSettings } from "@/app/lib/calculate";
import type { BronMateriaal, BronProduct } from "./adapters";
import { configVanProducten } from "./adapters";
import { berekenPrijs, type PricingResult } from "./engine";
import { invoerVanKlant } from "./adapters";

export const BASIS_KOSTEN: CalcCostSettings = {
  arbeidEnabled: true,
  arbeidStapEenheid: "DAGDEEL",
  arbeidTariefUur: 50,
  arbeidTariefDagdeel: 200,
  arbeidTariefDag: 380,
  arbeidAfronden: false,
  transportEnabled: true,
  transportTarief: 0,
  voorrijEnabled: true,
  voorrijTarief: 35,
  materiaalEnabled: true,
  btwPercentage: 21,
  bandbreedteModus: "GEEN",
  bandbreedteMargeOmlaag: 10,
  bandbreedteMargeOmhoog: 10,
};

export function optie(id: string, naam: string, prijs: number, extra: Partial<BronProduct["materiaalCategorieen"][number]["materialen"][number]> = {}) {
  return { id, naam, prijs, prijsType: "VAST" as const, prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null, ...extra };
}

export type TestProduct = Omit<BronProduct, "materiaalCategorieen" | "extraOpties" | "naam" | "eenheid"> & {
  naam: string;
  eenheid: string;
  materiaalCategorieen: { id: string; naam: string; verplicht?: boolean; materialen: BronMateriaal[] }[];
  extraOpties: { id: string; naam: string; prijs: number; altijd?: boolean; type: "PER_EENHEID" | "PER_STUK" }[];
};

export function product(p: Partial<TestProduct> & { id: string }): TestProduct {
  return {
    naam: p.id,
    eenheid: "m2",
    productiviteit: 10,
    arbeidTariefOverride: null,
    transportkostenOverride: null,
    transportMeeschalend: false,
    voorrijkostenOverride: null,
    voorrijMeeschalend: false,
    materiaalCategorieen: [{ id: `${p.id}-cat`, naam: "Materiaal", materialen: [optie(`${p.id}-mat`, "Materiaal", 20)] }],
    extraOpties: [],
    ...p,
  };
}

export function reken(
  producten: TestProduct[],
  invoer: { hoeveelheden?: Record<string, number>; sjabloonInvoer?: Record<string, Record<string, unknown>>; materiaalKeuzes?: Record<string, string>; extraKeuzes?: Record<string, number> },
  kosten: Partial<CalcCostSettings> = {},
  opties: Parameters<typeof configVanProducten>[2] = {}
): PricingResult {
  const config = configVanProducten(producten, { ...BASIS_KOSTEN, ...kosten }, opties);
  return berekenPrijs(config, invoerVanKlant({ producten, ...invoer }));
}
