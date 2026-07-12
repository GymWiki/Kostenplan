import { z } from "zod";

// Empty/blank input becomes `null` (feature disabled); anything else must be
// a positive number. Used for optional numeric fields like arbeidsCapaciteit
// and stapgrootte.
const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().positive().nullable()
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
  arbeidStapEenheid: z.enum(["UUR", "DAGDEEL", "DAG"]),
  arbeidTarief: z.coerce.number().min(0),

  transportEnabled: z.boolean(),
  transportZichtbaar: z.boolean(),
  transportType: z.enum(["VAST", "PER_KM"]),
  transportTarief: z.coerce.number().min(0),

  voorrijEnabled: z.boolean(),
  voorrijZichtbaar: z.boolean(),
  voorrijTarief: z.coerce.number().min(0),

  materiaalEnabled: z.boolean(),
  materiaalZichtbaar: z.boolean(),
  materiaalMarge: z.coerce.number().min(0).max(500),

  btwPercentage: z.coerce.number().min(0).max(100),
});

export const serviceSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  eenheid: z.string().trim().min(1).max(20),
  arbeidstijd: z.coerce.number().min(0),
  materiaalkosten: z.coerce.number().min(0),
  actief: z.boolean(),
});

export const productSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  eenheid: z.string().trim().min(1).max(20),
  arbeidsCapaciteit: optionalPositiveNumber,
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
  actief: z.boolean(),
});
