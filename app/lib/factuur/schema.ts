import { z } from "zod";
import { offerteInhoudSchema } from "@/app/lib/offerte/schema";
import type { FactuurInhoud } from "./model";

const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));

// Server-side controle van de inhoud van een factuur (alles komt als JSON van de browser).
export const factuurInhoudSchema = offerteInhoudSchema.extend({
  factuur: z.object({
    soort: z.enum(["factuur", "termijn", "eindfactuur", "creditnota"]),
    nummer: z.string().max(40).nullable(),
    factuurdatum: datum,
    uitvoeringVan: datum,
    uitvoeringTot: datum,
    vervaldatum: datum,
    betaaltermijnDagen: z.number().int().min(0).max(365),
    offerteNummer: z.string().max(40),
    offerteVersie: z.number().int().nullable(),
    btwModus: z.enum(["normaal", "verlegd"]),
    klantBtwId: z.string().max(20),
    betaallink: z.string().max(500),
    termijn: z.object({ label: z.string().max(80), percentage: z.number() }).optional(),
    creditVoor: z.object({ nummer: z.string().max(40), datum: z.string().max(10) }).optional(),
    notitie: z.string().max(2000),
  }),
});

export function parseFactuurInhoud(invoer: unknown): { ok: true; inhoud: FactuurInhoud } | { ok: false; error: string } {
  const r = factuurInhoudSchema.safeParse(invoer);
  if (!r.success) return { ok: false, error: `Ongeldige factuur: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}` };
  return { ok: true, inhoud: r.data as FactuurInhoud };
}
