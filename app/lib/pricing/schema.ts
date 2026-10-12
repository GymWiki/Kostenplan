import { z } from "zod";

// Configuratie en invoer van de rekenkern. Alle bedragen in de configuratie zijn in centen
// (een prijs per eenheid mag een deel van een cent bevatten, bijv. 12,345 euro per m²:
// 1234,5 cent; pas het bedrag per regel wordt op hele centen afgerond).
// Dit bestand is het enige in de kern dat zod nodig heeft; engine.ts importeert er alleen
// types uit, zodat zod niet in de browserbundel van de klant-rekentool terechtkomt.

const getal = z.number().finite();
const prijs = z.number().finite().min(0);

export const ARBEID_EENHEDEN = ["UUR", "DAGDEEL", "DAG"] as const;
export const SJABLOON_SOORTEN = ["ENKELE_HOEVEELHEID", "AFMETINGEN", "RUIMTES", "ARTIKELREGELS"] as const;

export const materiaalSchema = z.object({
  id: z.string().min(1),
  naam: z.string(),
  prijsCenten: prijs,
  prijsType: z.enum(["VAST", "BANDBREEDTE"]).default("VAST"),
  prijsMinCenten: prijs.nullable().default(null),
  prijsMaxCenten: prijs.nullable().default(null),
  // Wordt alleen verkocht per veelvoud van dit aantal (bijv. palen per 1,8 m).
  stapgrootte: getal.positive().nullable().default(null),
  // Vervangt het werktempo van het onderdeel voor dit materiaal (alleen van de eerste categorie).
  werktempoOverride: getal.positive().nullable().default(null),
});

export const categorieSchema = z.object({
  id: z.string().min(1),
  naam: z.string(),
  verplicht: z.boolean().default(false),
  materialen: z.array(materiaalSchema),
});

export const extraSchema = z.object({
  id: z.string().min(1),
  naam: z.string(),
  type: z.enum(["PER_EENHEID", "PER_STUK"]),
  prijsCenten: prijs,
  // Toeslag: telt altijd mee, zonder keuze van de klant.
  altijd: z.boolean().default(false),
});

export const onderdeelSchema = z.object({
  id: z.string().min(1),
  naam: z.string(),
  // Opgeslagen eenheid: "m1", "m2", "m3", "stuks", of een eigen eenheid.
  eenheid: z.string().default("stuks"),
  sjabloon: z.object({ soort: z.enum(SJABLOON_SOORTEN), config: z.record(z.string(), z.unknown()).default({}) }).default({ soort: "ENKELE_HOEVEELHEID", config: {} }),
  // Hoeveelheid per arbeidseenheid (in de eenheid van het onderdeel). null = geen arbeid.
  werktempo: getal.positive().nullable().default(null),
  arbeidTariefOverrideCenten: prijs.nullable().default(null),
  transportOverrideCenten: prijs.nullable().default(null),
  transportMeeschalend: z.boolean().default(false),
  transportPerDag: z.boolean().default(false),
  voorrijOverrideCenten: prijs.nullable().default(null),
  voorrijMeeschalend: z.boolean().default(false),
  categorieen: z.array(categorieSchema).default([]),
  extras: z.array(extraSchema).default([]),
});

export const tarievenSchema = z.object({
  materiaalEnabled: z.boolean().default(true),
  arbeidEnabled: z.boolean().default(true),
  arbeidEenheid: z.enum(ARBEID_EENHEDEN).default("DAGDEEL"),
  arbeidTariefCenten: prijs.default(0),
  // Arbeidstijd naar boven afronden op hele arbeidseenheden.
  arbeidAfronden: z.boolean().default(false),
  transportEnabled: z.boolean().default(true),
  transportTariefCenten: prijs.default(0),
  voorrijEnabled: z.boolean().default(true),
  voorrijTariefCenten: prijs.default(0),
  // PER_ONDERDEEL: elk onderdeel rekent zijn eigen vaste transport- en voorrijkosten (zoals de
  // bestaande rekentools). PER_AANVRAAG: één keer per aanvraag, het hoogste vaste bedrag telt.
  vasteKosten: z.enum(["PER_ONDERDEEL", "PER_AANVRAAG"]).default("PER_ONDERDEEL"),
  btwPercentage: getal.min(0).max(100).default(21),
  // Kleineondernemersregeling: geen btw berekend en getoond.
  kor: z.boolean().default(false),
  bandbreedte: z
    .object({ modus: z.enum(["GEEN", "PER_PRODUCT", "TOTAAL"]).default("GEEN"), margeOmlaag: getal.min(0).max(100).default(0), margeOmhoog: getal.min(0).max(1000).default(0) })
    .default({ modus: "GEEN", margeOmlaag: 0, margeOmhoog: 0 }),
});

export const pricingConfigSchema = z.object({
  // Versie van de vorm van deze configuratie (niet van de inhoud).
  versie: z.literal(1).default(1),
  tarieven: tarievenSchema,
  onderdelen: z.array(onderdeelSchema),
});

export const onderdeelInvoerSchema = z.object({
  // Alleen voor "Eén hoeveelheid".
  hoeveelheid: z.number().optional(),
  // Ruwe invoer van het sjabloon: { lengte, breedte, diepte }, { ruimtes: [...] } of { regels: [...] }.
  invoer: z.record(z.string(), z.unknown()).optional(),
  // categorie-id → gekozen materiaal-id
  materialen: z.record(z.string(), z.string()).default({}),
  // extra-id → aantal (bij ja/nee: 1)
  extras: z.record(z.string(), z.number()).default({}),
});

export const pricingInputSchema = z.object({
  // onderdeel-id → invoer. Een onderdeel dat hier niet in staat, of waarvan de hoeveelheid 0 is, telt niet mee.
  onderdelen: z.record(z.string(), onderdeelInvoerSchema),
});

export type PricingConfig = z.infer<typeof pricingConfigSchema>;
export type PricingConfigInput = z.input<typeof pricingConfigSchema>;
export type PricingOnderdeel = z.infer<typeof onderdeelSchema>;
export type PricingCategorie = z.infer<typeof categorieSchema>;
export type PricingMateriaal = z.infer<typeof materiaalSchema>;
export type PricingExtra = z.infer<typeof extraSchema>;
export type PricingTarieven = z.infer<typeof tarievenSchema>;
export type PricingOnderdeelInvoer = z.infer<typeof onderdeelInvoerSchema>;
export type PricingInput = z.infer<typeof pricingInputSchema>;
export type PricingInputInput = z.input<typeof pricingInputSchema>;
export type ArbeidEenheid = (typeof ARBEID_EENHEDEN)[number];

export function parsePricingConfig(ruw: unknown): PricingConfig {
  return pricingConfigSchema.parse(ruw);
}

export function parsePricingInput(ruw: unknown): PricingInput {
  return pricingInputSchema.parse(ruw);
}
