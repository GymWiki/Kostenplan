"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { parseGetal } from "@/app/lib/sjablonen";
import { slaBasisTarievenOp, type BasisTarieven } from "@/app/lib/basis-tarieven-server";
import { presetById } from "@/app/lib/presets";
import {
  methodeNaarInstelling,
  methodeVanProduct,
  type WerkzaamheidDraft,
} from "@/app/lib/werkzaamheid";
import { productCreateData, rijData, valideerDraft } from "@/app/lib/werkzaamheid-db";
import type { Prisma } from "@/app/generated/prisma/client";

// Server actions voor het nieuwe bewerkscherm en de aanmaak-wizard. De UI
// stuurt een WerkzaamheidDraft (zie app/lib/werkzaamheid.ts); alles wat het
// nieuwe scherm niet kan tonen (andere sjablonen, afwijkende tarieven, extra
// materiaalgroepen, foto's, stapgrootte) blijft hier bewust onaangeroerd.

export type OpslaanResultaat =
  | { ok: true; ids: Record<string, string> }
  | { ok: false; error: string };

// Autosave van het bewerkscherm. Bewust GEEN revalidatePath: dat zou de
// aanroepende pagina na elke wijziging opnieuw laten renderen (skeleton-
// flits), en alle andere pagina's zijn dynamisch en dus altijd vers.
export async function saveWerkzaamheidAction(
  productId: string,
  draft: WerkzaamheidDraft
): Promise<OpslaanResultaat> {
  const { company } = await requireActiveCompany();

  const fout = valideerDraft(draft);
  if (fout) return { ok: false, error: fout };

  const product = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId: company.id } },
    include: {
      materiaalCategorieen: { orderBy: { order: "asc" }, include: { materialen: true } },
      extraOpties: { select: { id: true } },
    },
  });
  if (!product) return { ok: false, error: "Onderdeel niet gevonden." };

  const ids: Record<string, string> = {};

  await prisma.$transaction(async (tx) => {
    const huidigeMethode = methodeVanProduct(product);
    const instelling = draft.methode && draft.methode !== huidigeMethode ? methodeNaarInstelling(draft.methode) : null;
    const tempo = parseGetal(draft.productiviteit, 0);

    await tx.product.update({
      where: { id: product.id },
      data: {
        naam: draft.naam.trim(),
        productiviteit: tempo > 0 ? tempo : null,
        transportPerDag: draft.transportPerDag,
        ...(instelling
          ? {
              sjabloon: instelling.sjabloon,
              eenheid: instelling.eenheid,
              sjabloonConfig: instelling.sjabloonConfig as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    let categorie = product.materiaalCategorieen[0];
    if (!categorie) {
      const nieuw = await tx.materialCategory.create({
        data: { productId: product.id, naam: "Materiaal", verplicht: true, order: 0 },
        include: { materialen: true },
      });
      categorie = nieuw;
    }

    const bestaande = new Set(categorie.materialen.map((m) => m.id));
    const behouden = new Set(draft.materialen.map((r) => r.id).filter((id): id is string => !!id && bestaande.has(id)));
    const weg = [...bestaande].filter((id) => !behouden.has(id));
    if (weg.length > 0) {
      await tx.materialOption.deleteMany({ where: { id: { in: weg }, materialCategoryId: categorie.id } });
    }

    for (const [i, r] of draft.materialen.entries()) {
      const data = rijData(draft, r);
      if (r.id && bestaande.has(r.id)) {
        await tx.materialOption.update({ where: { id: r.id }, data: { ...data, order: i } });
        ids[r.sleutel] = r.id;
      } else {
        const gemaakt = await tx.materialOption.create({
          data: { ...data, materialCategoryId: categorie.id, order: i },
          select: { id: true },
        });
        ids[r.sleutel] = gemaakt.id;
      }
    }

    // Extra vragen en toeslagen: alleen als de draft ze meestuurt.
    if (draft.extras) {
      const bestaandeExtras = new Set(product.extraOpties.map((e) => e.id));
      const behoudenExtras = new Set(draft.extras.map((e) => e.id).filter((id): id is string => !!id && bestaandeExtras.has(id)));
      const wegExtras = [...bestaandeExtras].filter((id) => !behoudenExtras.has(id));
      if (wegExtras.length > 0) await tx.extraOption.deleteMany({ where: { id: { in: wegExtras }, productId: product.id } });
      for (const [i, e] of draft.extras.entries()) {
        const data = { naam: e.naam.trim(), prijs: parseGetal(e.prijs, 0), type: e.type, altijd: e.altijd, order: i };
        if (e.id && bestaandeExtras.has(e.id)) {
          await tx.extraOption.update({ where: { id: e.id }, data });
          ids[e.sleutel] = e.id;
        } else {
          const gemaakt = await tx.extraOption.create({ data: { ...data, productId: product.id }, select: { id: true } });
          ids[e.sleutel] = gemaakt.id;
        }
      }
    }

    // Bandbreedte-prijzen tonen vraagt dat de rekentool in een bandbreedtemodus
    // staat; staat die uit, dan zetten we 'm op "per werkzaamheid".
    if (draft.bandbreedte) {
      await tx.costSettings.updateMany({
        where: { toolId: product.toolId, bandbreedteModus: "GEEN" },
        data: { bandbreedteModus: "PER_PRODUCT" },
      });
    }
  });

  return { ok: true, ids };
}

export type AanmaakResultaat =
  | { ok: true; productId: string; naam: string }
  | { ok: false; error: string };

// Wizard: maakt de werkzaamheid pas aan bij "Zet op mijn website" — niets
// half-afgemaakts in de database als iemand annuleert.
export async function createWerkzaamheidAction(
  toolId: string,
  draft: WerkzaamheidDraft,
  presetId: string | null
): Promise<AanmaakResultaat> {
  const { company, tool } = await requireActiveTool(toolId);

  const fout = valideerDraft(draft);
  if (fout) return { ok: false, error: fout };
  if (!draft.methode) return { ok: false, error: "Kies hoe je dit rekent." };

  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  if (limiet !== null) {
    const aantal = await prisma.product.count({ where: { tool: { companyId: company.id } } });
    if (aantal >= limiet) {
      return {
        ok: false,
        error: `Je hebt de limiet van ${limiet} onderdelen (over al je rekentools heen) voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor een onbeperkt aantal onderdelen.`,
      };
    }
  }

  const preset = presetId ? presetById(presetId) : undefined;
  const order = await prisma.product.count({ where: { toolId } });

  const product = await prisma.product.create({
    data: productCreateData(toolId, draft, preset, order),
    select: { id: true, naam: true },
  });

  revalidatePath(`/dashboard/tools/${toolId}/producten`);
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true, productId: product.id, naam: product.naam };
}

export async function setWerkzaamheidActiefAction(
  productId: string,
  actief: boolean
): Promise<{ ok: boolean }> {
  const { company } = await requireActiveCompany();
  const product = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId: company.id } },
    select: { id: true, toolId: true, tool: { select: { slug: true } } },
  });
  if (!product) return { ok: false };
  await prisma.product.update({ where: { id: product.id }, data: { actief } });
  revalidatePath(`/t/${company.slug}/${product.tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true };
}

export async function deleteWerkzaamheidAction(productId: string): Promise<{ ok: boolean; toolId?: string }> {
  const { company } = await requireActiveCompany();
  const product = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId: company.id } },
    select: { id: true, toolId: true, tool: { select: { slug: true } } },
  });
  if (!product) return { ok: false };
  await prisma.product.delete({ where: { id: product.id } });
  revalidatePath(`/dashboard/tools/${product.toolId}/producten`);
  revalidatePath(`/t/${company.slug}/${product.tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true, toolId: product.toolId };
}

export type TarievenResultaat =
  | { ok: true; tarieven: BasisTarieven }
  | { ok: false; error: string };

// "Mijn tarieven": tarief per arbeidseenheid (de eenheid die de tool nu
// gebruikt), voorrijkosten en transport. Zelfde opslag als de eenmalige
// basistarieven-vraag.
export async function saveTarievenAction(
  toolId: string,
  invoer: { tarief: string; voorrij: string; transport: string }
): Promise<TarievenResultaat> {
  const { company, tool } = await requireActiveTool(toolId);

  const tarief = parseGetal(invoer.tarief, NaN);
  const voorrij = parseGetal(invoer.voorrij, NaN);
  const transport = parseGetal(invoer.transport, NaN);
  if ([tarief, voorrij, transport].some((n) => Number.isNaN(n) || n < 0)) {
    return { ok: false, error: "Vul bij elk veld een bedrag in (0 mag ook)." };
  }

  const huidig = await prisma.costSettings.findUnique({
    where: { toolId },
    select: { arbeidStapEenheid: true },
  });
  const resultaat = await slaBasisTarievenOp(company.id, toolId, {
    arbeidStapEenheid: huidig?.arbeidStapEenheid ?? "UUR",
    arbeidTarief: tarief,
    voorrijTarief: voorrij,
    transportTarief: transport,
  });
  if ("error" in resultaat) return { ok: false, error: resultaat.error };

  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true, tarieven: resultaat.opgeslagen };
}
