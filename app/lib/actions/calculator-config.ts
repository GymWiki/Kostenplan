"use server";

import { revalidatePath } from "next/cache";
import { requireDraftCalculatorConfig, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { legeCalculatorConfig, valideerCalculatorConfig, type CalculatorConfigData, type ValidatieMelding } from "@/app/lib/calculator-engine";
import type { Prisma } from "@/app/generated/prisma/client";

// ---------------------------------------------------------------------------
// Fase 11 — draft/publish + versionering (Deel 20/21 van de opdracht):
// bewerken gebeurt altijd op een DRAFT-rij (zie requireDraftCalculatorConfig
// in dal.ts); publiceren archiveert de vorige live versie (nooit verwijderd
// — historische Leads blijven ernaar verwijzen) en maakt de DRAFT de nieuwe
// live versie, waarna er meteen een verse DRAFT (een kopie) klaarstaat om
// aan verder te bouwen. Zo breekt een halve wijziging nooit de live
// calculator.
// ---------------------------------------------------------------------------

export type SaveCalculatorConfigResult = { meldingen: ValidatieMelding[] };

// Autosave-stijl (zelfde patroon als het productbewerkscherm): sla de hele
// configuratie in één keer op, geen aparte "voeg veld toe"/"verwijder
// regel"-server-acties — de builder-UI houdt de volledige
// CalculatorConfigData client-side bij (React state) en persisteert 'm hier.
// Slaat altijd op, ook met FOUT-meldingen: een DRAFT mag onderweg tijdelijk
// ongeldig zijn (zie Deel 20 — pas publiceren blokkeert daadwerkelijk op
// fouten, zie publishCalculatorConfigAction hieronder).
export async function saveCalculatorConfigDraftAction(
  toolId: string,
  config: CalculatorConfigData
): Promise<SaveCalculatorConfigResult> {
  const { draft } = await requireDraftCalculatorConfig(toolId);

  await prisma.calculatorConfig.update({
    where: { id: draft.id },
    data: { config: config as unknown as Prisma.InputJsonValue },
  });

  revalidatePath(`/dashboard/tools/${toolId}/bouwer`);
  return { meldingen: valideerCalculatorConfig(config) };
}

export type PublishCalculatorConfigResult =
  | { success: true }
  | { success: false; meldingen: ValidatieMelding[] };

// Publiceren (Deel 20: "Concept -> Preview -> Publiceren -> Live"). Blokkeert
// op FOUT-meldingen (WAARSCHUWING mag) — zie heeftBlokkerendeFouten in
// validate.ts. Bij succes: huidige PUBLISHED -> ARCHIVED, DRAFT -> PUBLISHED
// + Tool.activeCalculatorConfigId erheen, en meteen een nieuwe DRAFT (kopie)
// aangemaakt zodat de vakman direct verder kan bouwen.
export async function publishCalculatorConfigAction(toolId: string): Promise<PublishCalculatorConfigResult> {
  const { company, tool, draft } = await requireDraftCalculatorConfig(toolId);
  const config = draft.config as unknown as CalculatorConfigData;

  const meldingen = valideerCalculatorConfig(config);
  if (meldingen.some((m) => m.ernst === "FOUT")) {
    return { success: false, meldingen };
  }

  await prisma.$transaction(async (tx) => {
    if (tool.activeCalculatorConfigId) {
      // Ontkoppel eerst de FK op Tool (die verwijst nog naar de oude
      // PUBLISHED-rij) vóór we die rij zelf op ARCHIVED zetten — anders
      // botst dat met geen enkele constraint, maar zo blijft de volgorde
      // "Tool wijst nooit naar een niet-PUBLISHED rij" ook tussentijds waar.
      await tx.tool.update({ where: { id: tool.id }, data: { activeCalculatorConfigId: null } });
      await tx.calculatorConfig.update({
        where: { id: tool.activeCalculatorConfigId },
        data: { status: "ARCHIVED" },
      });
    }

    await tx.calculatorConfig.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await tx.tool.update({ where: { id: tool.id }, data: { activeCalculatorConfigId: draft.id } });

    await tx.calculatorConfig.create({
      data: {
        toolId: tool.id,
        version: draft.version + 1,
        status: "DRAFT",
        config: draft.config as Prisma.InputJsonValue,
      },
    });
  });

  revalidatePath(`/dashboard/tools/${toolId}/bouwer`);
  revalidatePath(`/dashboard/tools/${toolId}`);
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { success: true };
}

// Verwerpt onopgeslagen wijzigingen in de DRAFT: zet 'm terug naar een kopie
// van de huidige live (PUBLISHED) configuratie, of naar leeg als de tool nog
// nooit iets heeft gepubliceerd.
export async function discardCalculatorConfigDraftAction(toolId: string): Promise<CalculatorConfigData> {
  const { tool, draft } = await requireDraftCalculatorConfig(toolId);

  const gepubliceerd = tool.activeCalculatorConfigId
    ? await prisma.calculatorConfig.findUnique({ where: { id: tool.activeCalculatorConfigId } })
    : null;
  const teruggezetteConfig = (gepubliceerd ? gepubliceerd.config : legeCalculatorConfig()) as unknown as CalculatorConfigData;

  await prisma.calculatorConfig.update({
    where: { id: draft.id },
    data: { config: teruggezetteConfig as unknown as Prisma.InputJsonValue },
  });

  revalidatePath(`/dashboard/tools/${toolId}/bouwer`);
  return teruggezetteConfig;
}

export type ProductKeuzeOptieInvoer = { id?: string; naam: string; prijs: number };

// Deel 11: een PRODUCT_KEUZE-veld verwijst naar een MaterialCategory —
// bewust hergebruik van de bestaande materiaalstructuur i.p.v. een tweede,
// losse productcatalogus (zie ProductKeuzeVeld in calculator-engine/types.ts).
// Deze actie beheert die MaterialCategory + zijn MaterialOption-opties
// vanuit de calculator-bouwer, zonder dat de vakman ooit het woord
// "product" hoeft te zien. Eerste aanroep (materialCategoryId ontbreekt)
// maakt een eigen, verborgen "drager"-Product aan (actief: false, dus nooit
// zichtbaar in het bestaande sjabloon-gedreven klantpad) met precies één
// MaterialCategory; latere aanroepen syncen de opties (bijwerken/toevoegen/
// verwijderen) binnen die bestaande categorie.
export async function upsertProductKeuzeOptiesAction(
  toolId: string,
  materialCategoryId: string | null,
  veldLabel: string,
  opties: ProductKeuzeOptieInvoer[]
): Promise<{ materialCategoryId: string } | { error: string }> {
  const { tool } = await requireActiveTool(toolId);

  const schoneOpties = opties
    .map((o) => ({ id: o.id, naam: o.naam.trim(), prijs: Number.isFinite(o.prijs) ? Math.max(0, o.prijs) : 0 }))
    .filter((o) => o.naam.length > 0);
  if (schoneOpties.length === 0) {
    return { error: "Voeg minimaal één optie toe." };
  }

  let categoryId = materialCategoryId;
  if (categoryId) {
    const bestaande = await prisma.materialCategory.findFirst({
      where: { id: categoryId, product: { toolId: tool.id } },
      select: { id: true },
    });
    if (!bestaande) return { error: "Materiaalcategorie niet gevonden." };
  } else {
    const product = await prisma.product.create({
      data: { toolId: tool.id, naam: `${veldLabel} (calculator-bouwer)`, actief: false, order: -1 },
    });
    const category = await prisma.materialCategory.create({
      data: { productId: product.id, naam: veldLabel, order: 0 },
    });
    categoryId = category.id;
  }

  const bestaandeOpties = await prisma.materialOption.findMany({
    where: { materialCategoryId: categoryId },
    select: { id: true },
  });
  const behoudenIds = new Set(schoneOpties.map((o) => o.id).filter((id): id is string => Boolean(id)));
  const teVerwijderenIds = bestaandeOpties.filter((o) => !behoudenIds.has(o.id)).map((o) => o.id);

  await prisma.$transaction([
    ...(teVerwijderenIds.length > 0
      ? [prisma.materialOption.deleteMany({ where: { id: { in: teVerwijderenIds } } })]
      : []),
    ...schoneOpties.map((optie, i) =>
      optie.id
        ? prisma.materialOption.update({ where: { id: optie.id }, data: { naam: optie.naam, prijs: optie.prijs, order: i } })
        : prisma.materialOption.create({
            data: { materialCategoryId: categoryId!, naam: optie.naam, prijs: optie.prijs, order: i },
          })
    ),
  ]);

  return { materialCategoryId: categoryId };
}

// Schakelt een tool terug naar het bestaande, sjabloon-gedreven pad (Deel
// 31: "maak geen breaking migration" — dit is het ontsnappingsluik als de
// vakman de engine toch niet wil gebruiken voor deze tool). De DRAFT/
// ARCHIVED/PUBLISHED-geschiedenis blijft gewoon bestaan (nooit verwijderd —
// historische leads blijven ernaar verwijzen), alleen de "welke wint"-
// aanwijzer op Tool wordt losgekoppeld.
export async function schakelUitCalculatorEngineAction(toolId: string) {
  const { tool } = await requireActiveTool(toolId);
  await prisma.tool.update({ where: { id: tool.id }, data: { activeCalculatorConfigId: null } });
  revalidatePath(`/dashboard/tools/${toolId}`);
}
