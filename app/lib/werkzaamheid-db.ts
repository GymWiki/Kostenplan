import { parseGetal } from "@/app/lib/sjablonen";
import {
  methodeNaarInstelling,
  valideerExtras,
  valideerMaterialen,
  type MateriaalRij,
  type WerkzaamheidDraft,
} from "@/app/lib/werkzaamheid";
import type { Prisma } from "@/app/generated/prisma/client";

// Database-kant van een onderdeel (werkzaamheid): validatie en de create-data.
// Gedeeld door de server actions van de editor en het importeren van een
// concept uit de browser. Bewust géén "use server": dit zijn geen acties.

const MAX_MATERIALEN = 50;

export function valideerDraft(d: WerkzaamheidDraft): string | null {
  if (d.naam.trim() === "") return "Geef het onderdeel een naam.";
  if (d.naam.trim().length > 120) return "De naam is te lang (maximaal 120 tekens).";
  if (d.materialen.length === 0) return "Houd minstens één materiaal over.";
  if (d.materialen.length > MAX_MATERIALEN) return "Er zijn te veel materialen.";
  const fouten = valideerMaterialen(d);
  if (fouten.length > 0) return fouten[0].melding;
  const extraFouten = valideerExtras(d);
  if (extraFouten.length > 0) return extraFouten[0].melding;
  if ((d.extras?.length ?? 0) > 50) return "Er zijn te veel extra's.";
  if (d.werktempoEenheid != null && !["UUR", "DAGDEEL", "DAG"].includes(d.werktempoEenheid)) return "Kies uur, dagdeel of dag.";
  const tempo = parseGetal(d.productiviteit, 0);
  if (d.productiviteit.trim() !== "" && (!(tempo >= 0) || Number.isNaN(parseGetal(d.productiviteit, NaN)))) {
    return "Vul bij arbeid een getal in.";
  }
  return null;
}

export function rijData(d: WerkzaamheidDraft, r: MateriaalRij) {
  const min = parseGetal(r.prijsMin, 0);
  const max = parseGetal(r.prijsMax, 0);
  const tempo = parseGetal(r.productiviteitOverride, 0);
  return {
    naam: r.naam.trim(),
    prijs: d.bandbreedte ? min : parseGetal(r.prijs, 0),
    prijsType: d.bandbreedte ? ("BANDBREEDTE" as const) : ("VAST" as const),
    prijsMin: d.bandbreedte ? min : null,
    prijsMax: d.bandbreedte ? max : null,
    // Werktempo per materiaal uit = eigen tempo's weg (bewuste keuze van de hovenier).
    productiviteitOverride: d.werktempoPerMateriaal && tempo > 0 ? tempo : null,
    isVoorbeeld: r.isVoorbeeld,
  };
}


// Alles om een nieuw onderdeel (Product) met materialen en extra's aan te maken.
export function productCreateData(
  toolId: string,
  draft: WerkzaamheidDraft,
  preset: { uitleg?: string | null; icoon?: string | null } | undefined,
  order: number,
  opties: { actief?: boolean } = {}
): Prisma.ProductUncheckedCreateInput {
  if (!draft.methode) throw new Error("Een onderdeel zonder rekenmethode kan niet worden aangemaakt.");
  const instelling = methodeNaarInstelling(draft.methode);
  const tempo = parseGetal(draft.productiviteit, 0);
  return {
    toolId,
    naam: draft.naam.trim(),
    omschrijving: preset?.uitleg ?? null,
    icoon: preset?.icoon ?? null,
    eenheid: instelling.eenheid,
    sjabloon: instelling.sjabloon,
    sjabloonConfig: instelling.sjabloonConfig as Prisma.InputJsonValue,
    productiviteit: tempo > 0 ? tempo : null,
    werktempoEenheid: draft.werktempoEenheid ?? null,
    transportPerDag: draft.transportPerDag,
    actief: opties.actief ?? true,
    order,
    extraOpties: {
      create: (draft.extras ?? []).map((e, i) => ({
        naam: e.naam.trim(),
        prijs: parseGetal(e.prijs, 0),
        type: e.type,
        altijd: e.altijd,
        order: i,
      })),
    },
    materiaalCategorieen: {
      create: [
        {
          naam: "Materiaal",
          verplicht: true,
          order: 0,
          materialen: { create: draft.materialen.map((r, i) => ({ ...rijData(draft, r), order: i })) },
        },
      ],
    },
  };
}
