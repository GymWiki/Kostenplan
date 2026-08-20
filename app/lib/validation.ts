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
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn"),
});

export const companySchema = z.object({
  naam: z.string().trim().min(2, "Vul een bedrijfsnaam in").max(80),
});

export const onboardingToolSchema = z.object({
  naam: z.string().trim().min(2, "Vul een naam voor je rekentool in").max(80),
});

export const toolSchema = z.object({
  naam: z.string().trim().min(2, "Vul een naam in").max(80),
  icoon: optionalIconName,
});

export const toolResultaatConfigSchema = z.object({
  prijsWeergave: z.enum(["EXACT", "VANAF", "RANGE", "GEEN"], "Kies een prijsweergave"),
  afronding: z.enum(["GEEN", "HEEL_EURO", "VIJF_EURO", "TIEN_EURO"], "Kies een afronding"),
  ctaType: z.enum(
    ["OFFERTE_AANVRAGEN", "AANVRAAG_VERSTUREN", "CONTACT_OPNEMEN", "BEL_MIJ", "WHATSAPP", "AFSPRAAK_MAKEN"],
    "Kies een actietype"
  ),
  ctaTekst: z.string().trim().max(60).optional().or(z.literal("")),
  toelichting: z.string().trim().max(300).optional().or(z.literal("")),
});

export const toolEmbedConfigSchema = z.object({
  breedte: z.enum(["VOLLEDIG", "VAST"], "Kies een breedte"),
  vasteBreedtePx: z.coerce.number().int().min(200).max(2000),
  minimaleHoogtePx: z.coerce.number().int().min(200).max(4000),
  transparanteAchtergrond: z.boolean(),
  toonBorder: z.boolean(),
  radiusPx: z.coerce.number().int().min(0).max(48),
});

export const toolLeadFormConfigSchema = z.object({
  vraagTelefoon: z.boolean(),
  vraagAdres: z.boolean(),
  vraagPostcode: z.boolean(),
  vraagHuisnummer: z.boolean(),
  vraagOpmerking: z.boolean(),
});

export const companyDetailsSchema = z.object({
  naam: z.string().trim().min(2, "Vul een bedrijfsnaam in").max(80),
  kvkNummer: z.string().trim().max(20).optional(),
  adres: z.string().trim().max(200).optional(),
});

export const deleteCompanySchema = z.object({
  bevestigingsNaam: z.string().trim().min(1, "Typ de bedrijfsnaam ter bevestiging"),
});

export const pauseSubscriptionSchema = z.object({
  maanden: z.coerce.number().int().min(1).max(3),
});

export const cancelSubscriptionSchema = z.object({
  reden: z.enum(["TE_DUUR", "GEBRUIK_TE_WEINIG", "MIST_FUNCTIE", "ANDERS"]).optional(),
  toelichting: z.string().trim().max(500).optional(),
});

export const changePasswordSchema = z.object({
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  password: z.string().min(1, "Vul je wachtwoord in"),
});

export const costSettingsSchema = z.object({
  arbeidEnabled: z.boolean(),
  arbeidZichtbaar: z.boolean(),
  arbeidStapEenheid: z.enum(["UUR", "DAGDEEL", "DAG"], "Kies een eenheid om in te rekenen"),
  arbeidTariefUur: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig tarief in").min(0, "Tarief kan niet negatief zijn")
  ),
  arbeidTariefDagdeel: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig tarief in").min(0, "Tarief kan niet negatief zijn")
  ),
  arbeidTariefDag: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig tarief in").min(0, "Tarief kan niet negatief zijn")
  ),
  arbeidAfronden: z.boolean(),

  transportEnabled: z.boolean(),
  transportZichtbaar: z.boolean(),
  transportTarief: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig bedrag in").min(0, "Bedrag kan niet negatief zijn")
  ),

  voorrijEnabled: z.boolean(),
  voorrijZichtbaar: z.boolean(),
  voorrijTarief: z.preprocess(
    normalizeDecimalInput,
    z.coerce.number("Vul een geldig bedrag in").min(0, "Bedrag kan niet negatief zijn")
  ),

  materiaalEnabled: z.boolean(),
  materiaalZichtbaar: z.boolean(),

  btwPercentage: z.preprocess(
    normalizeDecimalInput,
    z.coerce
      .number("Vul een geldig percentage in")
      .min(0, "Btw kan niet negatief zijn")
      .max(100, "Btw kan niet hoger zijn dan 100%")
  ),

  bandbreedteModus: z.enum(["GEEN", "PER_PRODUCT", "TOTAAL"], "Kies een bandbreedte-modus"),
  bandbreedteMargeOmlaag: z.preprocess(
    normalizeDecimalInput,
    z.coerce
      .number("Vul een geldig percentage in")
      .min(0, "Marge kan niet negatief zijn")
      .max(50, "Marge kan niet hoger zijn dan 50%")
  ),
  bandbreedteMargeOmhoog: z.preprocess(
    normalizeDecimalInput,
    z.coerce
      .number("Vul een geldig percentage in")
      .min(0, "Marge kan niet negatief zijn")
      .max(50, "Marge kan niet hoger zijn dan 50%")
  ),
});

export const PRODUCT_SJABLONEN = ["ENKELE_HOEVEELHEID", "AFMETINGEN", "RUIMTES", "ARTIKELREGELS"] as const;

// sjabloonConfig komt als JSON-string binnen (net als leadSnapshotSchema en
// offerteUpdateSchema hieronder) — client-side samengesteld door
// coerceVeldWaarden() (app/lib/sjablonen.ts), dus al naar de juiste
// getal/boolean-types omgezet. De server ziet hier alleen toe op de VORM
// (een object/array), niet op de sjabloon-specifieke inhoud — die interpreteert
// alleen SJABLOON_REGISTRY, en die is puur code, niet user-authored.
function parseJsonPreprocess(val: unknown, fallback: unknown) {
  if (typeof val !== "string" || val.trim() === "") return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export const productSchema = z
  .object({
    naam: z.string().trim().min(1, "Vul een naam in").max(120),
    omschrijving: z.string().trim().max(500).optional().or(z.literal("")),
    eenheid: z.string().trim().min(1).max(20),
    sjabloon: z.enum(PRODUCT_SJABLONEN, "Kies een sjabloon"),
    sjabloonConfig: z.preprocess(
      (val) => parseJsonPreprocess(val, {}),
      z.record(z.string(), z.unknown())
    ),
    // Kostenopbouw — blok 1 (materiaal) loopt via materiaalCategorieen/
    // MaterialOption (los van dit schema, zie materialOptionSchema
    // hieronder). Blok 2-4 hier.
    productiviteit: optionalPositiveNumber,
    arbeidTariefOverride: optionalNonNegativeNumber,
    transportkostenOverride: optionalNonNegativeNumber,
    transportMeeschalend: z.boolean(),
    voorrijkostenOverride: optionalNonNegativeNumber,
    voorrijMeeschalend: z.boolean(),
    icoon: optionalIconName,
    actief: z.boolean(),
  })
  // Eenheid ligt vast zodra het sjabloon zelf een eenheid oplegt (m²/m³) —
  // zie design-beslissing 4 en vasteEenheidVoorSjabloon() in sjablonen.ts.
  .refine(
    (data) => data.sjabloon !== "AFMETINGEN" || data.eenheid === "m2" || data.eenheid === "m3",
    { message: "Afmetingen rekent altijd in m² of m³", path: ["eenheid"] }
  )
  .refine((data) => data.sjabloon !== "RUIMTES" || data.eenheid === "m2", {
    message: "Ruimtes rekent altijd in m²",
    path: ["eenheid"],
  });

export const materialCategorySchema = z.object({
  naam: z.string().trim().min(1, "Vul een naam in").max(60),
  verplicht: z.coerce.boolean().default(false),
});

export const materialOptionSchema = z
  .object({
    naam: z.string().trim().min(1, "Vul een naam in").max(120),
    // Volledige verkoopprijs per eenheid, inclusief marge — geen meerprijs
    // bovenop een aparte basisprijs meer.
    prijs: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
    prijsType: z.enum(["VAST", "BANDBREEDTE"], "Kies vast of bandbreedte"),
    prijsMin: optionalNonNegativeNumber,
    prijsMax: optionalNonNegativeNumber,
    stapgrootte: optionalPositiveNumber,
    // Vervangt Product.productiviteit voor dit materiaal — leeg = gebruik de
    // productiviteit van het product.
    productiviteitOverride: optionalPositiveNumber,
    actief: z.boolean(),
  })
  .refine(
    (data) =>
      data.prijsType !== "BANDBREEDTE" ||
      (data.prijsMin != null && data.prijsMax != null && data.prijsMin <= data.prijsMax),
    { message: "Minimumprijs moet kleiner of gelijk zijn aan maximumprijs", path: ["prijsMax"] }
  );

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
  offerteIntroTekst: z.string().trim().max(2000).optional().or(z.literal("")),
  offerteVoorwaardenTekst: z.string().trim().max(4000).optional().or(z.literal("")),
  offerteGeldigheidsdagen: z.coerce.number().int().min(1).max(365),
});

export const brandingExtractSchema = z.object({
  url: z.string().trim().min(1, "Vul een website-URL in").max(2048),
});

// Losse, kleinere schema dan brandingSchema — de onboarding-stap past alleen
// toe wat de auto-detectie vond en de gebruiker aangevinkt liet staan, nooit
// alle brandingvelden tegelijk (zie applyOnboardingBrandingAction).
export const onboardingBrandingSchema = z.object({
  primaireKleur: hexColor.optional().or(z.literal("")),
  lettertype: z.enum(["MODERN", "KLASSIEK", "VRIENDELIJK", "STOER"]).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  customTitel: z.string().trim().max(120).optional().or(z.literal("")),
  welkomstTekst: z.string().trim().max(500).optional().or(z.literal("")),
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
  regels: z.array(leadSnapshotLineSchema).min(1, "Selecteer minimaal één product"),
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

const offerteRegelSchema = z.object({
  id: z.string().min(1),
  omschrijving: z.string().trim().min(1, "Vul een omschrijving in").max(300),
  aantal: z.number().nonnegative(),
  eenheid: z.string().trim().min(1).max(30),
  prijsPerEenheid: z.number(),
});

// Regels komen als JSON-string binnen (net als leadSnapshotSchema hierboven)
// — client-side vrij bewerkbare array, server ziet alleen toe op de vorm.
export const offerteUpdateSchema = z.object({
  regels: z.array(offerteRegelSchema).min(1, "Voeg minimaal één regel toe"),
  introTekst: z.string().trim().max(2000).optional().or(z.literal("")),
  voorwaardenTekst: z.string().trim().max(4000).optional().or(z.literal("")),
  geldigTot: z.string().trim().min(1, "Kies een geldigheidsdatum"),
});

export const offerteReactieSchema = z.object({
  beslissing: z.enum(["GEACCEPTEERD", "AFGEWEZEN"], "Ongeldige keuze"),
  opmerking: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const leadStatusSchema = z.object({
  status: z.enum(
    ["NIEUW", "IN_BEHANDELING", "OFFERTE_VERSTUURD", "GEWONNEN", "VERLOREN", "EXTERN_AFGEHANDELD"],
    "Kies een status"
  ),
});

export const externAfgehandeldNotitieSchema = z.object({
  notitie: z.string().trim().max(1000).optional().or(z.literal("")),
});
