import { z } from "zod";
import { parseGetal } from "@/app/lib/sjablonen";
import { nieuweId } from "@/app/lib/draft-id";

export { nieuweId };

// Het concept van een gast ("voorbeeld"): alles wat de hovenier in /probeer
// maakt, in dezelfde vorm als de editor al gebruikt (WerkzaamheidDraft per
// onderdeel). Staat alleen in de browser. Dit schema wordt zowel in de browser
// (inlezen) als op de server (importeren) gebruikt: de server vertrouwt de
// browser nooit en valideert en schoont alles opnieuw.

export const DRAFT_VERSIE = 1;
export const DRAFT_SLEUTEL = "kostenplan:draft:v1";
export const DRAFT_MAX_LEEFTIJD_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_ONDERDELEN = 20;
export const MAX_MATERIALEN = 50;
export const MAX_EXTRAS = 20;
export const MAX_LOGO_DATAURL = 280_000; // ±200 KB binair
const MAX_BEDRAG = 1_000_000;

// Verwijdert HTML-achtige tekens en stuurtekens; trimt.
export function schoonTekst(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

const tekst = (max: number) => z.string().max(max * 4).transform(schoonTekst).pipe(z.string().max(max));

const getalTekst = z
  .string()
  .max(20)
  .regex(/^[0-9.,\s]*$/, "Alleen cijfers")
  .refine((s) => {
    const n = parseGetal(s, 0);
    return Number.isFinite(n) && n >= 0 && n <= MAX_BEDRAG;
  }, "Getal is te groot");

const id = z.string().min(1).max(60).regex(/^[\w-]+$/);

const materiaalSchema = z.object({
  sleutel: id,
  id: id.optional(),
  naam: tekst(120),
  prijs: getalTekst,
  prijsMin: getalTekst,
  prijsMax: getalTekst,
  productiviteitOverride: getalTekst,
  isVoorbeeld: z.boolean(),
});

const extraSchema = z.object({
  sleutel: id,
  id: id.optional(),
  naam: tekst(120),
  prijs: getalTekst,
  type: z.enum(["PER_EENHEID", "PER_STUK"]),
  altijd: z.boolean(),
});

export const werkzaamheidDraftSchema = z.object({
  naam: tekst(120).pipe(z.string().min(1)),
  methode: z.enum(["METER", "M2", "LENGTE_BREEDTE", "STUK"]).nullable(),
  productiviteit: getalTekst,
  transportPerDag: z.boolean(),
  bandbreedte: z.boolean(),
  werktempoPerMateriaal: z.boolean(),
  materialen: z.array(materiaalSchema).min(1).max(MAX_MATERIALEN),
  extras: z.array(extraSchema).max(MAX_EXTRAS).optional(),
});

const kleur = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const draftSchema = z.object({
  version: z.literal(DRAFT_VERSIE),
  // Willekeurige sleutel van deze draft: zorgt dat importeren maar één keer telt.
  id: id,
  updatedAt: z.number().int().positive(),
  company: z.object({
    name: tekst(80),
    // data:image/…;base64,… (verkleind in de browser); de server controleert opnieuw.
    logoDataUrl: z.string().max(MAX_LOGO_DATAURL).optional(),
    colors: z.object({ primair: kleur, achtergrond: kleur.optional() }),
    titel: tekst(120).optional(),
    welkomst: tekst(500).optional(),
    lettertype: z.enum(["MODERN", "KLASSIEK", "VRIENDELIJK", "STOER"]).optional(),
  }),
  tarieven: z.object({
    tarief: z.number().min(0).max(10_000),
    voorrijkosten: z.number().min(0).max(10_000),
    transport: z.number().min(0).max(10_000),
  }),
  calculator: z.object({
    name: tekst(80).pipe(z.string().min(1)),
    werkzaamheden: z
      .array(
        z.object({
          id: id,
          actief: z.boolean(),
          icoon: z.string().max(40).regex(/^[\w-]*$/).nullable().optional(),
          presetId: z.string().max(60).regex(/^[\w-]*$/).nullable().optional(),
          draft: werkzaamheidDraftSchema,
        })
      )
      .max(MAX_ONDERDELEN),
  }),
});

export type Draft = z.infer<typeof draftSchema>;
export type DraftWerkzaamheid = Draft["calculator"]["werkzaamheden"][number];

// Lettertypes: moet overeenkomen met Lettertype in prisma/schema.prisma.
export function isVerlopen(d: { updatedAt: number }, nu = Date.now()): boolean {
  return nu - d.updatedAt > DRAFT_MAX_LEEFTIJD_MS;
}
