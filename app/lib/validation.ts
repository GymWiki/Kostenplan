import { z } from "zod";
import { PRODUCT_ICON_NAMES } from "@/app/lib/icons";

// Dutch (and most non-US) mobile keyboards produce a decimal comma, which
// z.coerce.number() doesn't understand (Number("1,8") is NaN) — normalize
// it to a period before coercion. Also handles the DecimalInput components
// no longer being native <input type="number">, so no browser-level
// numeric parsing happens before this reaches the server at all.
function normalizeDecimalInput(val: unknown) {
  if (typeof val === "string") return val.trim().replace(",", ".");
  return val;
}

// Empty/blank input becomes `null` (feature disabled); anything else must be
// a positive number. Used for optional numeric fields like arbeidsCapaciteit
// and stapgrootte.
const optionalPositiveNumber = z.preprocess((val) => {
  const normalized = normalizeDecimalInput(val);
  return normalized === "" || normalized === null || normalized === undefined
    ? null
    : normalized;
}, z.coerce.number().positive().nullable());

// Same as optionalPositiveNumber but allows 0 — used for per-product
// overrides where "0" is a meaningful value (e.g. 0% opslag).
const optionalNonNegativeNumber = z.preprocess((val) => {
  const normalized = normalizeDecimalInput(val);
  return normalized === "" || normalized === null || normalized === undefined
    ? null
    : normalized;
}, z.coerce.number().min(0).nullable());

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
  arbeidTarief: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig tarief in").min(0, "Tarief kan niet negatief zijn")
  ),
  arbeidTariefPerProduct: z.boolean(),

  transportEnabled: z.boolean(),
  transportZichtbaar: z.boolean(),

  voorrijEnabled: z.boolean(),
  voorrijZichtbaar: z.boolean(),
  voorrijTarief: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig bedrag in").min(0, "Bedrag kan niet negatief zijn")
  ),

  materiaalEnabled: z.boolean(),
  materiaalZichtbaar: z.boolean(),
  materiaalMarge: z.preprocess(
    normalizeDecimalInput,
    z.coerce
      .number("Vul een geldig percentage in")
      .min(0, "Opslag kan niet negatief zijn")
      .max(500, "Opslag kan niet hoger zijn dan 500%")
  ),
  materiaalMargePerProduct: z.boolean(),

  btwPercentage: z.preprocess(
    normalizeDecimalInput,
    z.coerce
      .number("Vul een geldig percentage in")
      .min(0, "Btw kan niet negatief zijn")
      .max(100, "Btw kan niet hoger zijn dan 100%")
  ),
});

export const serviceSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  prijsType: z.enum(["UURTARIEF", "VASTE_PRIJS"], "Kies een prijsvorm"),
  uurtarief: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
  geschatteUren: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
  vastePrijs: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
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
  transportkosten: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
  icoon: optionalIconName,
  actief: z.boolean(),
});

export const materialCategorySchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(60),
});

export const materialOptionSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  prijs: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
  stapgrootte: optionalPositiveNumber,
  actief: z.boolean(),
});

export const extraOptionSchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(120),
  omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
  prijs: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
  type: z.enum(["PER_EENHEID", "PER_STUK"]),
  actief: z.boolean(),
});

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Vul een geldige hexcode in, bijv. #15803d");

export const brandingSchema = z.object({
  primaireKleur: hexColor,
  achtergrondKleur: hexColor,
  lettertype: z.enum(["MODERN", "KLASSIEK", "VRIENDELIJK", "STOER"], "Kies een lettertype"),
  customTitel: z.string().trim().max(120).optional().or(z.literal("")),
  welkomstTekst: z.string().trim().max(500).optional().or(z.literal("")),
  bedankTekst: z.string().trim().min(1, "Vul een bedanktekst in").max(500),
  toonTelefoonnummer: z.boolean(),
  telefoonnummer: z.string().trim().max(30).optional().or(z.literal("")),
  toonEmail: z.boolean(),
  contactPositie: z.enum(["BOVENAAN", "ONDERAAN"], "Kies een positie"),
});

export const checkoutSchema = z.object({
  plan: z.enum(["GRATIS", "PLUS", "PRO"], "Kies een pakket"),
  interval: z.enum(["MAANDELIJKS", "JAARLIJKS"], "Kies een betaalperiode"),
});

const leadSnapshotLineSchema = z.object({
  naam: z.string(),
  type: z.enum(["dienst", "product"]),
  aantal: z.number().optional(),
  eenheid: z.string().optional(),
  materiaal: z.string().optional(),
  extras: z.array(z.string()).optional(),
  prijs: z.number().optional(),
});

// Vertrouwt de client-berekende bedragen (geen echte transactie, slechts een
// prijsindicatie die de vakman zelf te zien krijgt in zijn eigen CRM) — ziet
// alleen toe op de VORM van de data, niet op herberekening server-side.
export const leadSnapshotSchema = z.object({
  regels: z.array(leadSnapshotLineSchema).min(1, "Selecteer minimaal één dienst of product"),
  arbeidskosten: z.number(),
  materiaalkosten: z.number(),
  transportkosten: z.number(),
  voorrijkosten: z.number(),
  subtotaal: z.number(),
  btw: z.number(),
  totaal: z.number(),
});

export const leadContactSchema = z.object({
  naam: z.string().trim().min(1, "Vul je naam in").max(120),
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  telefoonnummer: z.string().trim().max(30).optional().or(z.literal("")),
});

export const leadNoteSchema = z.object({
  tekst: z.string().trim().min(1, "Vul een notitie in").max(2000),
});

export const leadStatusSchema = z.object({
  status: z.enum(
    ["NIEUW", "IN_BEHANDELING", "OFFERTE_VERSTUURD", "GEWONNEN", "VERLOREN"],
    "Kies een status"
  ),
});
