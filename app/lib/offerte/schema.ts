import { z } from "zod";
import { BTW_TARIEVEN } from "./btw-config";
import type { OfferteInhoud } from "./model";

// Server-side controle van de inhoud van een offerte (alles komt als JSON van de browser).
const tekst = (max: number) => z.string().max(max);
const adres = z.object({ straat: tekst(120), postcode: tekst(12), plaats: tekst(80) });

const regel = z.object({
  id: z.string().min(1).max(60),
  type: z.enum(["normaal", "stelpost", "optioneel", "tekst"]),
  omschrijving: tekst(300),
  aantal: z.number().finite().min(0).max(1_000_000),
  eenheid: tekst(20),
  prijsCenten: z.number().int().min(-100_000_000).max(1_000_000_000),
  btw: z.number().refine((n) => (BTW_TARIEVEN as readonly number[]).includes(n), "Onbekend btw-tarief"),
  soort: z.enum(["arbeid", "materiaal", "planten", "transport", "overig"]),
  kortingPct: z.number().min(0).max(100).optional(),
  toelichting: tekst(300).optional(),
});

const afzender = z.object({
  handelsnaam: tekst(120),
  rechtsvorm: z.enum(["EENMANSZAAK", "VOF", "MAATSCHAP", "BV", "NV", "ANDERS"]),
  statutaireNaam: tekst(120),
  statutaireZetel: tekst(80),
  kvkNummer: tekst(20),
  adresRegel: tekst(120),
  postcode: tekst(12),
  plaats: tekst(80),
  btwId: tekst(20),
  korActief: z.boolean(),
  korTekst: tekst(200),
  iban: tekst(40),
  ibanTenaamstelling: tekst(120),
  telefoon: tekst(40),
  email: tekst(160),
  website: tekst(160),
  logoUrl: tekst(500),
  contactNaam: tekst(120),
  contactFunctie: tekst(80),
  kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  lettertype: z.enum(["MODERN", "KLASSIEK", "VRIENDELIJK", "STOER"]),
});

export const offerteInhoudSchema = z.object({
  nummer: tekst(40),
  versie: z.number().int().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  geldigTot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  afzender,
  klant: z.object({ type: z.enum(["particulier", "zakelijk"]), naam: tekst(120), bedrijfsnaam: tekst(120), adres, email: tekst(200), telefoon: tekst(40) }),
  projectadresGelijk: z.boolean(),
  projectadres: adres,
  onderwerp: tekst(200),
  introductie: tekst(3000),
  secties: z.array(z.object({ id: z.string().min(1).max(60), titel: tekst(200), productId: z.string().max(60).optional(), regels: z.array(regel).max(100) })).max(40),
  voorwaarden: z.array(tekst(1000)).max(30),
  herroeping: z.object({ aan: z.boolean(), tekst: tekst(4000) }),
  betaaltermijnen: z.array(z.object({ label: tekst(80), percentage: z.number().min(0).max(100) })).max(10),
  planning: z.object({ startweek: tekst(40), doorlooptijd: tekst(120) }),
  bijlagen: z.array(z.object({ naam: tekst(160), url: tekst(600) })).max(10),
  slottekst: tekst(3000),
  bron: z.object({ leadId: z.string(), totaalRekentoolInclCenten: z.number(), bandbreedte: z.boolean().optional(), waarschuwingen: z.array(z.string().max(400)).max(20).optional() }).optional(),
});

export function parseOfferteInhoud(invoer: unknown): { ok: true; inhoud: OfferteInhoud } | { ok: false; error: string } {
  const r = offerteInhoudSchema.safeParse(invoer);
  if (!r.success) return { ok: false, error: `Ongeldige offerte: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}` };
  return { ok: true, inhoud: r.data as OfferteInhoud };
}
