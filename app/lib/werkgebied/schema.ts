import { z } from "zod";
import "@/app/lib/zod-nl";

// Instellingen voor "Werkgebied en minimum": per bedrijf, en per rekentool optioneel een eigen versie.
// Alles staat standaard uit: een rekentool zonder deze instellingen gedraagt zich precies zoals voorheen.
// Bedragen voor de toeslag zijn excl. btw (zoals voorrijkosten); het minimumbedrag is incl. btw.

import { meldingBuiten, STANDAARD_MELDING_BUITEN } from "./teksten";

export { STANDAARD_MELDING_BUITEN };

export const startadresSchema = z.object({
  postcode: z.string().trim().max(10),
  huisnummer: z.string().trim().max(10),
  toevoeging: z.string().trim().max(10).default(""),
  straat: z.string().trim().max(120).default(""),
  plaats: z.string().trim().max(120).default(""),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const zoneSchema = z.object({
  // Tot en met deze afstand (km) geldt dit bedrag; null = alles daarboven.
  totKm: z.number().positive().max(2000).nullable(),
  // Toeslag excl. btw; null = niet mogelijk.
  bedragEuro: z.number().min(0).max(100000).nullable(),
});

export const werkgebiedSchema = z.object({
  aan: z.boolean().default(false),
  methode: z.enum(["STRAAL", "POSTCODES"]).default("STRAAL"),
  start: startadresSchema.nullable().default(null),
  straalKm: z.number().min(1).max(2000).default(30),
  // Ruwe tekst met 4-cijferige postcodes en reeksen, bijv. "8000-8099, 8101, 8200".
  postcodes: z.string().max(20000).default(""),
  buiten: z.enum(["GEEN_AANVRAAG", "MARKEREN", "TOESLAG"]).default("GEEN_AANVRAAG"),
  toeslag: z
    .object({
      modus: z.enum(["PER_KM", "ZONES"]).default("PER_KM"),
      perKmEuro: z.number().min(0).max(1000).default(0.5),
      zones: z.array(zoneSchema).max(12).default([{ totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }]),
    })
    .default({ modus: "PER_KM", perKmEuro: 0.5, zones: [{ totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }] }),
  // Eigen tekst bij een adres buiten het werkgebied; leeg = de standaardtekst.
  melding: z.string().trim().max(600).default(""),
  // Optioneel: een vriendelijke afwijzing per mail aan de klant bij een aanvraag buiten het werkgebied.
  afwijzingsmail: z
    .object({ aan: z.boolean().default(false), onderwerp: z.string().trim().max(150).default(""), tekst: z.string().trim().max(2000).default("") })
    .default({ aan: false, onderwerp: "", tekst: "" }),
});

export const minimumSchema = z.object({
  aan: z.boolean().default(false),
  // Minimumbedrag incl. btw.
  bedragEuro: z.number().min(0).max(1_000_000).default(0),
  gedrag: z.enum(["TARIEF", "GEEN_AANVRAAG", "MARKEREN"]).default("TARIEF"),
});

export const werkgebiedInstellingenSchema = z.object({
  werkgebied: werkgebiedSchema.default(() => werkgebiedSchema.parse({})),
  minimum: minimumSchema.default(() => minimumSchema.parse({})),
});

export type Startadres = z.infer<typeof startadresSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type WerkgebiedRegels = z.infer<typeof werkgebiedSchema>;
export type MinimumRegels = z.infer<typeof minimumSchema>;
export type WerkgebiedInstellingen = z.infer<typeof werkgebiedInstellingenSchema>;

export const LEGE_INSTELLINGEN: WerkgebiedInstellingen = werkgebiedInstellingenSchema.parse({});

// Ongeldige of ontbrekende opslag geeft "alles uit": een kapotte instelling mag nooit een rekentool blokkeren.
export function parseWerkgebied(json: unknown): WerkgebiedInstellingen {
  const r = werkgebiedInstellingenSchema.safeParse(json ?? {});
  return r.success ? r.data : LEGE_INSTELLINGEN;
}

// Een rekentool neemt de bedrijfsinstelling over (null) of heeft een eigen versie.
export function resolveWerkgebied(bedrijfJson: unknown, toolJson: unknown): WerkgebiedInstellingen {
  if (toolJson !== null && toolJson !== undefined) return parseWerkgebied(toolJson);
  return parseWerkgebied(bedrijfJson);
}

export const isActief = (i: WerkgebiedInstellingen) => i.werkgebied.aan || i.minimum.aan;

export const meldingTekst = (r: WerkgebiedRegels) => meldingBuiten(r.melding);
