import { z } from "zod";
import { PRODUCT_ICON_NAMES } from "@/app/lib/icons";

// Empty/blank input becomes `null` (feature disabled); anything else must be
// a positive number. Used for optional numeric fields like arbeidsCapaciteit
// and stapgrootte.
const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().positive().nullable()
);

// Same as optionalPositiveNumber but allows 0 — used for per-product
// overrides where "0" is a meaningful value (e.g. 0% opslag).
const optionalNonNegativeNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().min(0).nullable()
);

// Empty/blank input becomes `null` (geen icoon); anything else must be a
// known key from app/lib/icons.ts.
const optionalIconName = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.enum(PRODUCT_ICON_NAMES as [string, ...string[]], "Onbekend icoon").nullable()
);

export const registerSchema = z.object({
  bedrijfsnaam: z.string().trim().min(2, "Vul een bedrijfsnaam in").max(80),
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  password: z.string().min(1, "Vul je wachtwoord in"),
});

export const costSettingsSchema = z.object({
  arbeidEnabled: z.boolean(),
  arbeidZichtbaar: z.boolean(),
  arbeidStapEenheid: z.enum(["UUR", "DAGDEEL", "DAG"], "Kies een eenheid om in te rekenen"),
  arbeidTarief: z.coerce.number("Vul een geldig tarief in").min(0, "Tarief kan niet negatief zijn"),
  arbeidTariefPerProduct: z.boolean(),

  transportEnabled: z.boolean(),
  transportZichtbaar: z.boolean(),
  transportType: z.enum(["VAST", "PER_KM"], "Kies een transporttype"),
  transportTarief: z.coerce
    .number("Vul een geldig bedrag in")
    .min(0, "Bedrag kan niet negatief zijn"),

  voorrijEnabled: z.boolean(),
  voorrijZichtbaar: z.boolean(),
  voorrijTarief: z.coerce
    .number("Vul een geldig bedrag in")
    .min(0, "Bedrag kan niet negatief zijn"),

  materiaalEnabled: z.boolean(),
  materiaalZichtbaar: z.boolean(),
  materiaalMarge: z.coerce
    .number("Vul een geldig percentage in")
    .min(0, "Opslag kan niet negatief zijn")
    .max(500, "Opslag kan niet hoger zijn dan 500%"),
  materiaalMargePerProduct: z.boolean(),

  btwPercentage: z.coerce
    .number("Vul een geldig percentage in")
    .min(0, "Btw kan niet negatief zijn")
    .max(100, "Btw kan niet hoger zijn dan 100%"),
});

export const serviceSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  eenheid: z.string().trim().min(1).max(20),
  arbeidstijd: z.coerce.number().min(0),
  materiaalkosten: z.coerce.number().min(0),
  icoon: optionalIconName,
  actief: z.boolean(),
});

export const productSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  eenheid: z.string().trim().min(1).max(20),
  arbeidsCapaciteit: optionalPositiveNumber,
  arbeidTariefOverride: optionalNonNegativeNumber,
  materiaalMargeOverride: optionalNonNegativeNumber,
  icoon: optionalIconName,
  actief: z.boolean(),
});

export const materialCategorySchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(60),
});

export const materialOptionSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  prijs: z.coerce.number().min(0),
  stapgrootte: optionalPositiveNumber,
  actief: z.boolean(),
});

export const extraOptionSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  prijs: z.coerce.number().min(0),
  type: z.enum(["PER_EENHEID", "PER_STUK"]),
  actief: z.boolean(),
});
