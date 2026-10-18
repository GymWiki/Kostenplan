import { STANDAARD_UREN } from "@/app/lib/werktempo";
import type { CalcCostSettings } from "@/app/lib/calculate";
import type { WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import { parsePostcodes } from "@/app/lib/werkgebied/postcodes";
import type { LocatieInvoer, PricingConfig, PricingInput } from "./schema";

// Vertaalt de bestaande vorm (producten uit de database, kosteninstellingen, keuzes van de klant)
// naar de configuratie en invoer van de rekenkern. Verder doet dit bestand niets: alle rekenwerk
// zit in engine.ts.

export type BronMateriaal = {
  id: string;
  naam: string;
  prijs: number;
  prijsType: "VAST" | "BANDBREEDTE";
  prijsMin: number | null;
  prijsMax: number | null;
  stapgrootte: number | null;
  productiviteitOverride: number | null;
};

export type BronProduct = {
  id: string;
  naam?: string;
  eenheid?: string;
  sjabloon?: "ENKELE_HOEVEELHEID" | "AFMETINGEN" | "RUIMTES" | "ARTIKELREGELS";
  sjabloonConfig?: unknown;
  productiviteit: number | null;
  werktempoEenheid?: "UUR" | "DAGDEEL" | "DAG" | null;
  arbeidTariefOverride: number | null;
  transportkostenOverride: number | null;
  transportMeeschalend: boolean;
  transportPerDag?: boolean;
  voorrijkostenOverride: number | null;
  voorrijMeeschalend: boolean;
  materiaalCategorieen: { id: string; naam?: string; verplicht?: boolean; materialen: BronMateriaal[] }[];
  extraOpties: { id: string; naam?: string; prijs: number; altijd?: boolean; type: "PER_EENHEID" | "PER_STUK" }[];
};

export type ConfigOpties = {
  vasteKosten?: "PER_ONDERDEEL" | "PER_AANVRAAG";
  kor?: boolean;
  // Werkgebied en minimale opdracht (van het bedrijf of de rekentool). Uit = de config blijft zoals zonder.
  werkgebied?: WerkgebiedInstellingen | null;
};

// De instellingen zoals de hovenier ze invult (euro's, ruwe postcodetekst) naar de config van de kern (centen, reeksen).
export function locatieConfigVan(i: WerkgebiedInstellingen | null | undefined): Pick<PricingConfig, "werkgebied" | "minimum"> {
  if (!i || !(i.werkgebied.aan || i.minimum.aan)) return {};
  const w = i.werkgebied;
  const uit: Pick<PricingConfig, "werkgebied" | "minimum"> = {};
  if (w.aan) {
    uit.werkgebied = {
      aan: true,
      methode: w.methode,
      straalKm: w.straalKm,
      reeksen: parsePostcodes(w.postcodes).reeksen,
      buiten: w.buiten,
      toeslag: {
        modus: w.toeslag.modus,
        perKmCenten: w.toeslag.perKmEuro * 100,
        zones: w.toeslag.zones.map((z) => ({ totKm: z.totKm, bedragCenten: z.bedragEuro === null ? null : z.bedragEuro * 100 })),
      },
    };
  }
  if (i.minimum.aan) uit.minimum = { aan: true, bedragInclCenten: Math.round(i.minimum.bedragEuro * 100), gedrag: i.minimum.gedrag };
  return uit;
}

const cent = (euro: number | null | undefined) => (euro == null ? null : euro * 100);

export function arbeidTariefVoorEenheid(k: Pick<CalcCostSettings, "arbeidTariefUur" | "arbeidTariefDagdeel" | "arbeidTariefDag">, eenheid: "UUR" | "DAGDEEL" | "DAG"): number {
  if (eenheid === "UUR") return k.arbeidTariefUur;
  if (eenheid === "DAGDEEL") return k.arbeidTariefDagdeel;
  return k.arbeidTariefDag;
}

export function configVanProducten(producten: readonly BronProduct[], k: CalcCostSettings, opties: ConfigOpties = {}): PricingConfig {
  return {
    versie: 1,
    ...locatieConfigVan(opties.werkgebied),
    tarieven: {
      materiaalEnabled: k.materiaalEnabled,
      arbeidEnabled: k.arbeidEnabled,
      arbeidEenheid: k.arbeidStapEenheid,
      arbeidTariefCenten: arbeidTariefVoorEenheid(k, k.arbeidStapEenheid) * 100,
      arbeidAfronden: k.arbeidAfronden,
      urenPerDagdeel: k.urenPerDagdeel ?? STANDAARD_UREN.urenPerDagdeel,
      urenPerDag: k.urenPerDag ?? STANDAARD_UREN.urenPerDag,
      transportEnabled: k.transportEnabled,
      transportTariefCenten: k.transportTarief * 100,
      voorrijEnabled: k.voorrijEnabled,
      voorrijTariefCenten: k.voorrijTarief * 100,
      vasteKosten: opties.vasteKosten ?? "PER_ONDERDEEL",
      btwPercentage: k.btwPercentage,
      kor: opties.kor ?? false,
      bandbreedte: { modus: k.bandbreedteModus, margeOmlaag: k.bandbreedteMargeOmlaag, margeOmhoog: k.bandbreedteMargeOmhoog },
    },
    onderdelen: producten.map((p) => ({
      id: p.id,
      naam: p.naam ?? p.id,
      eenheid: p.eenheid ?? "stuks",
      sjabloon: { soort: p.sjabloon ?? "ENKELE_HOEVEELHEID", config: (p.sjabloonConfig as Record<string, unknown> | null) ?? {} },
      werktempo: p.productiviteit != null && p.productiviteit > 0 ? p.productiviteit : null,
      werktempoEenheid: p.werktempoEenheid ?? null,
      arbeidTariefOverrideCenten: cent(p.arbeidTariefOverride),
      transportOverrideCenten: cent(p.transportkostenOverride),
      transportMeeschalend: p.transportMeeschalend,
      transportPerDag: p.transportPerDag ?? false,
      voorrijOverrideCenten: cent(p.voorrijkostenOverride),
      voorrijMeeschalend: p.voorrijMeeschalend,
      categorieen: p.materiaalCategorieen.map((c) => ({
        id: c.id,
        naam: c.naam ?? c.id,
        verplicht: c.verplicht ?? false,
        materialen: c.materialen.map((m) => ({
          id: m.id,
          naam: m.naam,
          prijsCenten: m.prijs * 100,
          prijsType: m.prijsType,
          prijsMinCenten: cent(m.prijsMin),
          prijsMaxCenten: cent(m.prijsMax),
          stapgrootte: m.stapgrootte != null && m.stapgrootte > 0 ? m.stapgrootte : null,
          werktempoOverride: m.productiviteitOverride != null && m.productiviteitOverride > 0 ? m.productiviteitOverride : null,
        })),
      })),
      extras: p.extraOpties.map((e) => ({ id: e.id, naam: e.naam ?? e.id, type: e.type, prijsCenten: e.prijs * 100, altijd: e.altijd ?? false })),
    })),
  };
}

// De keuzes van de klant zoals de rekentool ze bijhoudt (losse mappen op id) naar de invoer van de kern.
// `hoeveelheden` is voor "Eén hoeveelheid"; `sjabloonInvoer` voor de andere sjablonen.
export function invoerVanKlant(args: {
  producten: readonly BronProduct[];
  hoeveelheden?: Record<string, number>;
  sjabloonInvoer?: Record<string, Record<string, unknown>>;
  materiaalKeuzes?: Record<string, string>;
  extraKeuzes?: Record<string, number>;
  locatie?: LocatieInvoer;
}): PricingInput {
  const onderdelen: PricingInput["onderdelen"] = {};
  for (const p of args.producten) {
    const heeftSjabloon = p.sjabloon != null && p.sjabloon !== "ENKELE_HOEVEELHEID";
    const hoeveelheid = args.hoeveelheden?.[p.id];
    const sjabloon = args.sjabloonInvoer?.[p.id];
    if (hoeveelheid === undefined && sjabloon === undefined) continue;
    const materialen: Record<string, string> = {};
    for (const c of p.materiaalCategorieen) {
      const keuze = args.materiaalKeuzes?.[c.id];
      if (keuze) materialen[c.id] = keuze;
    }
    const extras: Record<string, number> = {};
    for (const e of p.extraOpties) {
      const n = args.extraKeuzes?.[e.id];
      if (n) extras[e.id] = n;
    }
    onderdelen[p.id] = { ...(heeftSjabloon ? { invoer: sjabloon ?? {} } : { hoeveelheid: hoeveelheid ?? 0 }), materialen, extras };
  }
  return { onderdelen, ...(args.locatie ? { locatie: args.locatie } : {}) };
}
