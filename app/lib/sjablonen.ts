import type { ProductSjabloon } from "@/app/generated/prisma/client";

// ---------------------------------------------------------------------------
// Veldtype-bibliotheek — vijf herbruikbare bouwstenen, gebruikt zowel voor
// vakman-instellingen (het Hoeveelheid-blok, zie ProductForm) als voor wat de
// klant invult in de rekentool (ProductCard). Puur beschrijvend: dit bestand
// zegt alleen "welke velden, met welke labels" — het is aan de UI-laag om ze
// daadwerkelijk te renderen, en aan berekenHoeveelheid() hieronder (per
// sjabloon apart, geen generieke formule-interpreter) om er een uitkomst uit
// te berekenen.
// ---------------------------------------------------------------------------

type VeldBasis = {
  key: string;
  label: string;
};

export type GetalVeld = VeldBasis & {
  soort: "getal";
  eenheid?: string;
  min?: number;
  standaardWaarde?: number;
};

export type TekstVeld = VeldBasis & {
  soort: "tekst";
  placeholder?: string;
};

export type KeuzeVeld = VeldBasis & {
  soort: "keuze";
  opties: { waarde: string; label: string }[];
  standaardWaarde?: string;
};

export type JaNeeVeld = VeldBasis & {
  soort: "janee";
  standaardWaarde?: boolean;
};

// Herhaalbare regelgroep — één keer gebouwd, twee keer hergebruikt (Ruimtes
// en Artikelregels delen 'm, zowel als vakman-instelling (artikelTypes) als
// als klantinvoer (ruimtes/regels)). `zichtbaarAls` laat een kolom optioneel
// alleen tonen afhankelijk van een andere waarde in dezelfde regel (bijv.
// breedte/hoogte alleen bij een artikeltype dat op m² rekent).
export type RegelgroepVeld = VeldBasis & {
  soort: "regelgroep";
  kolommen: (GetalVeld | TekstVeld | KeuzeVeld)[];
  toevoegLabel: string;
  zichtbaarAls?: (kolomKey: string, regel: Record<string, unknown>) => boolean;
};

export type SjabloonVeld = GetalVeld | TekstVeld | KeuzeVeld | JaNeeVeld | RegelgroepVeld;

// ---------------------------------------------------------------------------
// Uitkomst van berekenHoeveelheid(): ofwel één hoeveelheid (× het bestaande
// Product.prijsPerEenheid, zie calculate.ts), ofwel — alleen bij
// Artikelregels — een lijst al-geprijsde regels, omdat elk artikeltype daar
// een eigen prijs heeft.
// ---------------------------------------------------------------------------

export type SjabloonRegelResultaat = { omschrijving: string; aantal: number; prijsPerEenheid: number };

export type SjabloonResultaat =
  | { soort: "hoeveelheid"; waarde: number }
  | { soort: "regels"; regels: SjabloonRegelResultaat[] };

export function hoeveelheidUitResultaat(resultaat: SjabloonResultaat): number {
  if (resultaat.soort === "hoeveelheid") return resultaat.waarde;
  return resultaat.regels.reduce((som, regel) => som + regel.aantal, 0);
}

// ---------------------------------------------------------------------------
// 1. Enkele hoeveelheid — bestaand gedrag. Geen instellingen, geen
// klantvelden uit deze bibliotheek: de UI blijft de bestaande QuantityStepper
// gebruiken (zie ProductCard in calculator.tsx), dit is puur het
// pass-through-geval voor de gedeelde berekenHoeveelheid-aanroep.
// ---------------------------------------------------------------------------

export type EnkeleHoeveelheidConfig = Record<string, never>;
export type EnkeleHoeveelheidInvoer = { hoeveelheid: number };

const enkeleHoeveelheid = {
  id: "ENKELE_HOEVEELHEID" as const,
  label: "Eén hoeveelheid",
  voorbeeldenTekst: "timmerwerk, snoeiwerk — alles met een vaste eenheidsprijs",
  instelVelden: [] as SjabloonVeld[],
  standaardConfig: {} as EnkeleHoeveelheidConfig,
  // Config-parameter genegeerd — zelfde signatuur als de andere sjablonen
  // (klantVelden(config)) zodat aanroepende code nooit per sjabloon hoeft
  // te weten of de functie de config gebruikt.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  klantVelden: (config: EnkeleHoeveelheidConfig): SjabloonVeld[] => [],
  standaardKlantInvoer: (): EnkeleHoeveelheidInvoer => ({ hoeveelheid: 1 }),
  berekenHoeveelheid: (
    _config: EnkeleHoeveelheidConfig,
    invoer: EnkeleHoeveelheidInvoer
  ): SjabloonResultaat => ({ soort: "hoeveelheid", waarde: Math.max(0, invoer.hoeveelheid) }),
  vasteEenheid: undefined,
};

// ---------------------------------------------------------------------------
// 2. Afmetingen — lengte × breedte (m²), optioneel × diepte (m³).
// ---------------------------------------------------------------------------

export type AfmetingenConfig = { metDiepte: boolean };
export type AfmetingenInvoer = { lengte: number; breedte: number; diepte: number };

const afmetingen = {
  id: "AFMETINGEN" as const,
  label: "Lengte × breedte",
  voorbeeldenTekst: "bestrating, gazon, vloeren",
  instelVelden: [
    { key: "metDiepte", soort: "janee", label: "Ook diepte meenemen (m³ in plaats van m²)", standaardWaarde: false },
  ] as SjabloonVeld[],
  standaardConfig: { metDiepte: false } as AfmetingenConfig,
  klantVelden: (config: AfmetingenConfig): SjabloonVeld[] => [
    { key: "lengte", soort: "getal", label: "Lengte", eenheid: "meter", min: 0 },
    { key: "breedte", soort: "getal", label: "Breedte", eenheid: "meter", min: 0 },
    ...(config.metDiepte
      ? ([{ key: "diepte", soort: "getal", label: "Diepte", eenheid: "meter", min: 0 }] as SjabloonVeld[])
      : []),
  ],
  standaardKlantInvoer: (): AfmetingenInvoer => ({ lengte: 0, breedte: 0, diepte: 0 }),
  berekenHoeveelheid: (config: AfmetingenConfig, invoer: AfmetingenInvoer): SjabloonResultaat => {
    const m2 = Math.max(0, invoer.lengte) * Math.max(0, invoer.breedte);
    const waarde = config.metDiepte ? m2 * Math.max(0, invoer.diepte) : m2;
    return { soort: "hoeveelheid", waarde };
  },
  vasteEenheid: (config: AfmetingenConfig) => (config.metDiepte ? "m3" : "m2"),
};

// ---------------------------------------------------------------------------
// 3. Ruimtes — klant voegt ruimtes toe (naam + l×b×h); vloer-/plafond-/
// wandoppervlak worden afgeleid en de door de vakman aangevinkte vlakken
// worden over alle ruimtes samengeteld tot één m²-hoeveelheid.
// ---------------------------------------------------------------------------

export type RuimtesConfig = {
  telVloerMee: boolean;
  telPlafondMee: boolean;
  telWandMee: boolean;
  standaardAftrek: number;
};
export type RuimteRegel = {
  naam: string;
  lengte: number;
  breedte: number;
  hoogte: number;
  aftrek: number;
};
export type RuimtesInvoer = { ruimtes: RuimteRegel[] };

function ruimteOppervlak(config: RuimtesConfig, ruimte: RuimteRegel): number {
  const l = Math.max(0, ruimte.lengte);
  const b = Math.max(0, ruimte.breedte);
  const h = Math.max(0, ruimte.hoogte);
  let totaal = 0;
  if (config.telVloerMee) totaal += l * b;
  if (config.telPlafondMee) totaal += l * b;
  if (config.telWandMee) totaal += Math.max(0, 2 * (l + b) * h - Math.max(0, ruimte.aftrek));
  return totaal;
}

const ruimtes = {
  id: "RUIMTES" as const,
  label: "Per ruimte",
  voorbeeldenTekst: "schilderwerk, stucwerk, vloerverwarming",
  instelVelden: [
    { key: "telVloerMee", soort: "janee", label: "Vloeroppervlak meetellen", standaardWaarde: false },
    { key: "telPlafondMee", soort: "janee", label: "Plafondoppervlak meetellen", standaardWaarde: false },
    { key: "telWandMee", soort: "janee", label: "Wandoppervlak meetellen", standaardWaarde: true },
    {
      key: "standaardAftrek",
      soort: "getal",
      label: "Standaard aftrek voor ramen/deuren",
      eenheid: "m² per ruimte",
      min: 0,
      standaardWaarde: 2.5,
    },
  ] as SjabloonVeld[],
  standaardConfig: {
    telVloerMee: false,
    telPlafondMee: false,
    telWandMee: true,
    standaardAftrek: 2.5,
  } as RuimtesConfig,
  klantVelden: (): SjabloonVeld[] => [
    {
      key: "ruimtes",
      soort: "regelgroep",
      label: "Ruimtes",
      toevoegLabel: "Ruimte toevoegen",
      kolommen: [
        { key: "naam", soort: "tekst", label: "Naam", placeholder: "Bijv. Woonkamer" },
        { key: "lengte", soort: "getal", label: "Lengte", eenheid: "meter", min: 0 },
        { key: "breedte", soort: "getal", label: "Breedte", eenheid: "meter", min: 0 },
        { key: "hoogte", soort: "getal", label: "Hoogte", eenheid: "meter", min: 0 },
        { key: "aftrek", soort: "getal", label: "Aftrek ramen/deuren", eenheid: "m²", min: 0 },
      ],
    },
  ],
  standaardKlantInvoer: (config: RuimtesConfig): RuimtesInvoer => ({
    ruimtes: [{ naam: "", lengte: 0, breedte: 0, hoogte: 0, aftrek: config.standaardAftrek }],
  }),
  berekenHoeveelheid: (config: RuimtesConfig, invoer: RuimtesInvoer): SjabloonResultaat => ({
    soort: "hoeveelheid",
    waarde: invoer.ruimtes.reduce((som, ruimte) => som + ruimteOppervlak(config, ruimte), 0),
  }),
  vasteEenheid: () => "m2" as const,
};

// ---------------------------------------------------------------------------
// 4. Artikelregels — klant stelt een lijst regels samen; elk artikeltype
// heeft een eigen, door de vakman ingestelde prijs. Wijkt daarom af van
// "hoeveelheid × Product.prijsPerEenheid": elke regel levert direct een
// bedrag, zie SjabloonResultaat hierboven.
// ---------------------------------------------------------------------------

export type ArtikelType = {
  id: string;
  naam: string;
  prijsPerEenheid: number;
  berekening: "m2" | "stuk";
};
export type ArtikelregelsConfig = { artikelTypes: ArtikelType[] };
export type ArtikelRegel = {
  artikelTypeId: string;
  breedte: number;
  hoogte: number;
  aantal: number;
};
export type ArtikelregelsInvoer = { regels: ArtikelRegel[] };

const artikelregels = {
  id: "ARTIKELREGELS" as const,
  label: "Per stuk",
  voorbeeldenTekst: "kozijnen, kastjes, ramen",
  instelVelden: [
    {
      key: "artikelTypes",
      soort: "regelgroep",
      label: "Artikeltypes",
      toevoegLabel: "Artikeltype toevoegen",
      kolommen: [
        { key: "naam", soort: "tekst", label: "Naam", placeholder: "Bijv. Draaikiepraam" },
        { key: "prijsPerEenheid", soort: "getal", label: "Prijs", eenheid: "€", min: 0 },
        {
          key: "berekening",
          soort: "keuze",
          label: "Prijs per",
          opties: [
            { waarde: "m2", label: "m² (breedte × hoogte)" },
            { waarde: "stuk", label: "stuk" },
          ],
          standaardWaarde: "stuk",
        },
      ],
    },
  ] as SjabloonVeld[],
  standaardConfig: { artikelTypes: [] } as ArtikelregelsConfig,
  klantVelden: (config: ArtikelregelsConfig): SjabloonVeld[] => [
    {
      key: "regels",
      soort: "regelgroep",
      label: "Regels",
      toevoegLabel: "Regel toevoegen",
      zichtbaarAls: (kolomKey, regel) => {
        if (kolomKey !== "breedte" && kolomKey !== "hoogte") return true;
        const type = config.artikelTypes.find((t) => t.id === regel.artikelTypeId);
        return type?.berekening === "m2";
      },
      kolommen: [
        {
          key: "artikelTypeId",
          soort: "keuze",
          label: "Type",
          opties: config.artikelTypes.map((t) => ({ waarde: t.id, label: t.naam })),
        },
        { key: "breedte", soort: "getal", label: "Breedte", eenheid: "meter", min: 0 },
        { key: "hoogte", soort: "getal", label: "Hoogte", eenheid: "meter", min: 0 },
        { key: "aantal", soort: "getal", label: "Aantal", min: 0, standaardWaarde: 1 },
      ],
    },
  ],
  standaardKlantInvoer: (config: ArtikelregelsConfig): ArtikelregelsInvoer => ({
    regels: [{ artikelTypeId: config.artikelTypes[0]?.id ?? "", breedte: 0, hoogte: 0, aantal: 1 }],
  }),
  berekenHoeveelheid: (config: ArtikelregelsConfig, invoer: ArtikelregelsInvoer): SjabloonResultaat => {
    const regels: SjabloonRegelResultaat[] = [];
    for (const regel of invoer.regels) {
      const type = config.artikelTypes.find((t) => t.id === regel.artikelTypeId);
      if (!type) continue;
      const aantal = Math.max(0, regel.aantal);
      if (aantal <= 0) continue;
      const eenhedenPerStuk =
        type.berekening === "m2" ? Math.max(0, regel.breedte) * Math.max(0, regel.hoogte) : 1;
      const totaalAantal = eenhedenPerStuk * aantal;
      if (totaalAantal <= 0) continue;
      regels.push({ omschrijving: type.naam, aantal: totaalAantal, prijsPerEenheid: type.prijsPerEenheid });
    }
    return { soort: "regels", regels };
  },
  vasteEenheid: undefined,
};

// ---------------------------------------------------------------------------
// Registry — nieuwe sjablonen komen er hier bij, zonder dat de rest van de
// engine (calculate.ts, de veldrenderer, het live voorbeeld) hoeft te weten
// dat er een nieuwe bijkwam.
// ---------------------------------------------------------------------------

export const SJABLOON_REGISTRY = {
  ENKELE_HOEVEELHEID: enkeleHoeveelheid,
  AFMETINGEN: afmetingen,
  RUIMTES: ruimtes,
  ARTIKELREGELS: artikelregels,
} satisfies Record<ProductSjabloon, unknown>;

export const SJABLOON_OPTIES: { id: ProductSjabloon; label: string; voorbeeldenTekst: string }[] = (
  Object.values(SJABLOON_REGISTRY) as { id: ProductSjabloon; label: string; voorbeeldenTekst: string }[]
).map(({ id, label, voorbeeldenTekst }) => ({ id, label, voorbeeldenTekst }));
