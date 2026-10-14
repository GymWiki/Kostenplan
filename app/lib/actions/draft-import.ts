"use server";
import { NIEUWE_REKENTOOL_WEERGAVE } from "@/app/lib/weergave/config";

import { revalidatePath } from "next/cache";
import { canCreateTool, requireActiveCompany, requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { generateUniqueSlug, generateUniqueToolSlug } from "@/app/lib/slug";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { draftSchema, type Draft } from "@/app/lib/draft";
import { presetById } from "@/app/lib/presets";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { logoUitDataUrl } from "@/app/lib/draft-logo";
import { productCreateData, valideerDraft } from "@/app/lib/werkzaamheid-db";
import { uploadFoto } from "@/app/lib/storage";

export type ImportResultaat =
  | { status: "geimporteerd"; toolId: string; afgekapt: boolean; logoOvergeslagen: boolean }
  | { status: "keuze" } // het account heeft al een bedrijf: toevoegen of weggooien?
  | { status: "weggegooid" }
  | { status: "ongeldig" }
  | { status: "limiet"; error: string };

// Neemt het concept uit de browser over in het account van de ingelogde
// gebruiker. De server vertrouwt de browser niet: alles wordt opnieuw gevalideerd
// en schoongemaakt, aantallen zijn begrensd, het logo wordt hier gecontroleerd
// en geüpload en er komt niets uit het concept in een user-id. Dubbel aanroepen
// maakt niets dubbel (importSleutel). Een account zonder bedrijf krijgt het
// concept direct; een account mét bedrijf moet eerst kiezen.
export async function importDraftAction(ruw: unknown, modus?: "toevoegen" | "weggooien"): Promise<ImportResultaat> {
  const user = await requireUser();

  const geparsed = draftSchema.safeParse(ruw);
  if (!geparsed.success) return { status: "ongeldig" };
  const draft: Draft = geparsed.data;

  // Elke onderdeel-draft moet ook de gewone validatie van de editor halen.
  for (const w of draft.calculator.werkzaamheden) {
    if (!w.draft.methode || valideerDraft(w.draft)) return { status: "ongeldig" };
  }

  // Al eerder geïmporteerd door dit account? Dan niets nieuws maken.
  const bestaand = await prisma.tool.findFirst({
    where: { importSleutel: draft.id, deletedAt: null, company: { members: { some: { userId: user.id } } } },
    select: { id: true },
  });
  if (bestaand) return { status: "geimporteerd", toolId: bestaand.id, afgekapt: false, logoOvergeslagen: false };

  const lidmaatschappen = await prisma.companyMember.count({ where: { userId: user.id } });
  if (lidmaatschappen > 0) {
    if (modus === "weggooien") return { status: "weggegooid" };
    if (modus !== "toevoegen") return { status: "keuze" };
  }

  let bestaandBedrijf: Awaited<ReturnType<typeof requireActiveCompany>>["company"] | null = null;
  if (lidmaatschappen > 0) {
    bestaandBedrijf = (await requireActiveCompany()).company;
    if (!(await canCreateTool(bestaandBedrijf.id, effectiveTier(bestaandBedrijf)))) {
      return { status: "limiet", error: "Je account zit al aan het maximum aantal rekentools voor je pakket. Gooi het voorbeeld weg of upgrade eerst." };
    }
  }

  const tier = bestaandBedrijf ? effectiveTier(bestaandBedrijf) : "GRATIS";
  const limiet = PLAN_LIMITS[tier].maxProductsPerCompany;
  const reedsAanwezig = bestaandBedrijf ? await prisma.product.count({ where: { tool: { companyId: bestaandBedrijf.id } } }) : 0;
  const ruimte = limiet === null ? draft.calculator.werkzaamheden.length : Math.max(0, limiet - reedsAanwezig);
  if (ruimte === 0 && draft.calculator.werkzaamheden.length > 0) return { status: "limiet", error: "Je zit al aan het maximum aantal onderdelen voor je pakket. Gooi het voorbeeld weg of upgrade eerst." };
  const onderdelen = draft.calculator.werkzaamheden.slice(0, ruimte);
  const afgekapt = onderdelen.length < draft.calculator.werkzaamheden.length;

  const bedrijfsnaam = draft.company.name || "Mijn bedrijf";
  const companySlug = bestaandBedrijf ? null : await generateUniqueSlug(bedrijfsnaam);
  const lettertype = draft.company.lettertype ?? "MODERN";

  const resultaat = await prisma.$transaction(async (tx) => {
    // Gelijktijdige aanroepen laten elkaar wachten; de tweede ziet daarna de eerste.
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${user.id + ":" + draft.id}))`;
    const dubbel = await tx.tool.findFirst({
      where: { importSleutel: draft.id, deletedAt: null, company: { members: { some: { userId: user.id } } } },
      select: { id: true },
    });
    if (dubbel) return { toolId: dubbel.id, companyId: null as string | null };

    const company =
      bestaandBedrijf ??
      (await tx.company.create({
        data: {
          naam: bedrijfsnaam,
          slug: companySlug!,
          createdBy: user.id,
          members: { create: { userId: user.id, rol: "owner" } },
          standaardVoorrijTarief: draft.tarieven.voorrijkosten,
        },
      }));

    const tool = await tx.tool.create({
      data: {
        companyId: company.id,
        naam: draft.calculator.name,
        slug: await generateUniqueToolSlug(company.id, draft.calculator.name, tx),
        importSleutel: draft.id,
        weergaveConfig: NIEUWE_REKENTOOL_WEERGAVE,
        order: await tx.tool.count({ where: { companyId: company.id } }),
        costSettings: {
          create: {
            arbeidStapEenheid: "DAGDEEL",
            arbeidTariefDagdeel: draft.tarieven.tarief,
            voorrijTarief: draft.tarieven.voorrijkosten,
            transportTarief: draft.tarieven.transport,
          },
        },
        branding: {
          create: {
            primaireKleur: draft.company.colors.primair,
            ...(draft.company.colors.achtergrond ? { achtergrondKleur: draft.company.colors.achtergrond } : {}),
            lettertype,
            ...(draft.company.titel ? { customTitel: draft.company.titel } : {}),
            ...(draft.company.welkomst ? { welkomstTekst: draft.company.welkomst } : {}),
          },
        },
      },
    });

    for (const [i, w] of onderdelen.entries()) {
      const preset = w.presetId ? presetById(w.presetId) : undefined;
      const icoon = preset?.icoon ?? (w.icoon && PRODUCT_ICONS[w.icoon] ? w.icoon : null);
      await tx.product.create({ data: productCreateData(tool.id, w.draft, { uitleg: preset?.uitleg ?? null, icoon }, i, { actief: w.actief }) });
    }
    return { toolId: tool.id, companyId: company.id as string | null };
  });

  // Logo: zelf controleren en uploaden (alleen png/jpg/webp, max 200 KB).
  let logoOvergeslagen = false;
  if (draft.company.logoDataUrl && resultaat.companyId) {
    const logo = logoUitDataUrl(draft.company.logoDataUrl);
    if (!logo) logoOvergeslagen = true;
    else {
      try {
        const upload = await uploadFoto(resultaat.companyId, new File([new Uint8Array(logo.bytes)], `logo.${logo.ext}`, { type: logo.mime }));
        if (upload.url) await prisma.branding.update({ where: { toolId: resultaat.toolId }, data: { logoUrl: upload.url } });
        else logoOvergeslagen = true;
      } catch {
        logoOvergeslagen = true;
      }
    }
  }

  revalidatePath("/dashboard", "layout");
  return { status: "geimporteerd", toolId: resultaat.toolId, afgekapt, logoOvergeslagen };
}
