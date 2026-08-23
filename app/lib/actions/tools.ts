"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany, requireActiveTool, canCreateTool, canPublishTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import {
  toolSchema,
  toolResultaatConfigSchema,
  toolLeadFormConfigSchema,
  toolEmbedConfigSchema,
} from "@/app/lib/validation";
import { generateUniqueToolSlug } from "@/app/lib/slug";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { calculatorTemplateById } from "@/app/lib/calculator-engine/templates";
import { modulaireCalculatorTemplateById } from "@/app/lib/calculator-engine/templates-modulair";
import { onderdeelTemplateById } from "@/app/lib/calculator-engine/templates-onderdeel";
import { legeModulaireCalculatorConfig, type ModulaireCalculatorConfigData, type OnderdeelConfig } from "@/app/lib/calculator-engine";
import { genereerId } from "@/app/dashboard/tools/[toolId]/bouwer/id-utils";
import type { Prisma, ToolStatus } from "@/app/generated/prisma/client";

export type ToolFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

function parseToolForm(formData: FormData) {
  return toolSchema.safeParse({
    naam: formData.get("naam"),
    icoon: formData.get("icoon") ?? "",
  });
}

function limietBereiktMelding(tier: ReturnType<typeof effectiveTier>) {
  const limiet = PLAN_LIMITS[tier].maxActiveTools;
  return `Je hebt de limiet van ${limiet} rekentool${limiet === 1 ? "" : "s"} voor je huidige pakket bereikt. Upgrade om meer rekentools te maken.`;
}

// "+ Nieuwe rekentool" — leeg beginnen (zie duplicateToolAction hieronder
// voor "dupliceren van bestaande tool"). Geen templatekeuze in Levering A,
// dat is Levering B. Begint altijd als CONCEPT met een eigen CostSettings
// die de company-defaults volgt (Deel 4 van de opdracht: "nieuwe tools
// gebruiken standaard de account-defaults").
export async function createToolAction(_prevState: ToolFormState, formData: FormData): Promise<ToolFormState> {
  const { company } = await requireActiveCompany();

  const parsed = parseToolForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  if (!(await canCreateTool(company.id, effectiveTier(company)))) {
    return { error: limietBereiktMelding(effectiveTier(company)) };
  }

  const slug = await generateUniqueToolSlug(company.id, parsed.data.naam);
  const count = await prisma.tool.count({ where: { companyId: company.id } });

  const tool = await prisma.tool.create({
    data: {
      companyId: company.id,
      naam: parsed.data.naam,
      icoon: parsed.data.icoon,
      slug,
      order: count,
      costSettings: { create: {} },
    },
  });

  revalidatePath("/dashboard/tools");
  redirect(`/dashboard/tools/${tool.id}`);
}

export type TemplateToolFormState = { error?: string } | null;

// "Kies een startpunt" (Levering B, Fase 15/Deel 24/28): maakt een nieuwe,
// volledig zelfstandige Tool aan op basis van een template — een kopie, geen
// live afhankelijkheid (Deel 29). Elk PRODUCT_KEUZE-veld in de template
// krijgt hier zijn eigen, echte MaterialCategory/MaterialOption-rijen (zie
// upsertProductKeuzeOptiesAction in calculator-config.ts voor hetzelfde
// patroon vanuit de bouwer zelf); de tool start als CONCEPT met een DRAFT-
// CalculatorConfig — de vakman bekijkt en publiceert 'm zelf vanuit de
// bouwer, precies zoals elke andere wijziging (Deel 20).
export async function createToolFromTemplateAction(
  templateId: string,
  _prevState: TemplateToolFormState,
  formData: FormData
): Promise<TemplateToolFormState> {
  const { company } = await requireActiveCompany();

  const template = calculatorTemplateById(templateId);
  if (!template) {
    return { error: "Onbekende template." };
  }

  const parsed = parseToolForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Vul een naam in." };
  }

  if (!(await canCreateTool(company.id, effectiveTier(company)))) {
    return { error: limietBereiktMelding(effectiveTier(company)) };
  }

  const slug = await generateUniqueToolSlug(company.id, parsed.data.naam);
  const count = await prisma.tool.count({ where: { companyId: company.id } });

  const tool = await prisma.tool.create({
    data: {
      companyId: company.id,
      naam: parsed.data.naam,
      icoon: template.icoon,
      slug,
      order: count,
      costSettings: { create: {} },
    },
  });

  // Elk PRODUCT_KEUZE-veld krijgt zijn eigen, verborgen "drager"-Product +
  // MaterialCategory + MaterialOption-rijen (Deel 11: hergebruik van de
  // bestaande materiaalstructuur, geen tweede productcatalogus).
  const materialCategoryIdPerVeld = new Map<string, string>();
  for (const keuze of template.materiaalKeuzes) {
    const product = await prisma.product.create({
      data: { toolId: tool.id, naam: `${keuze.veldId} (calculator-bouwer)`, actief: false, order: -1 },
    });
    const category = await prisma.materialCategory.create({
      data: { productId: product.id, naam: keuze.veldId, order: 0 },
    });
    await prisma.materialOption.createMany({
      data: keuze.opties.map((optie, i) => ({
        materialCategoryId: category.id,
        naam: optie.naam,
        prijs: optie.prijs,
        order: i,
      })),
    });
    materialCategoryIdPerVeld.set(keuze.veldId, category.id);
  }

  const config = template.bouwConfig();
  config.velden = config.velden.map((veld) =>
    veld.soort === "PRODUCT_KEUZE" ? { ...veld, materialCategoryId: materialCategoryIdPerVeld.get(veld.id) ?? veld.materialCategoryId } : veld
  );

  await prisma.calculatorConfig.create({
    data: { toolId: tool.id, version: 1, status: "DRAFT", config: config as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/dashboard/tools");
  redirect(`/dashboard/tools/${tool.id}/bouwer`);
}

// Levering B v2 (Deel 7 van de opdracht) — de modulaire tegenhanger van
// createToolFromTemplateAction hierboven: bouwt een Tool met meerdere
// Onderdelen tegelijk uit een ModulaireCalculatorTemplate (bijv. "Complete
// tuin"). Zelfde copy-on-use-garantie: elk Onderdeel krijgt zijn eigen
// verborgen carrier-Product(en) per PRODUCT_KEUZE-veld, nooit gedeeld
// tussen Onderdelen of tussen Tools (zie templates-onderdeel/templates-
// onderdeel.test.ts + templates-modulair.test.ts voor de mechanische
// garantie dat elk sjabloon geldig is vóór het ooit hier wordt gebruikt).
export async function createModulaireToolFromTemplateAction(
  templateId: string,
  _prevState: TemplateToolFormState,
  formData: FormData
): Promise<TemplateToolFormState> {
  const { company } = await requireActiveCompany();

  const template = modulaireCalculatorTemplateById(templateId);
  if (!template) {
    return { error: "Onbekende template." };
  }

  const parsed = parseToolForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Vul een naam in." };
  }

  if (!(await canCreateTool(company.id, effectiveTier(company)))) {
    return { error: limietBereiktMelding(effectiveTier(company)) };
  }

  const slug = await generateUniqueToolSlug(company.id, parsed.data.naam);
  const count = await prisma.tool.count({ where: { companyId: company.id } });

  const tool = await prisma.tool.create({
    data: {
      companyId: company.id,
      naam: parsed.data.naam,
      icoon: template.icoon,
      slug,
      order: count,
      costSettings: { create: {} },
    },
  });

  const onderdelen: OnderdeelConfig[] = [];
  const bestaandeOnderdeelIds = new Set<string>();
  let orderIndex = 0;

  for (const onderdeelTemplateId of template.onderdeelTemplateIds) {
    const onderdeelTemplate = onderdeelTemplateById(onderdeelTemplateId);
    if (!onderdeelTemplate) continue;

    const materialCategoryIdPerVeld = new Map<string, string>();
    for (const keuze of onderdeelTemplate.materiaalKeuzes) {
      const product = await prisma.product.create({
        data: { toolId: tool.id, naam: `${onderdeelTemplate.naam} — ${keuze.veldId} (calculator-bouwer)`, actief: false, order: -1 },
      });
      const category = await prisma.materialCategory.create({
        data: { productId: product.id, naam: keuze.veldId, order: 0 },
      });
      await prisma.materialOption.createMany({
        data: keuze.opties.map((optie, i) => ({ materialCategoryId: category.id, naam: optie.naam, prijs: optie.prijs, order: i })),
      });
      materialCategoryIdPerVeld.set(keuze.veldId, category.id);
    }

    const slice = onderdeelTemplate.bouwSlice();
    const velden = slice.velden.map((veld) =>
      veld.soort === "PRODUCT_KEUZE" ? { ...veld, materialCategoryId: materialCategoryIdPerVeld.get(veld.id) ?? veld.materialCategoryId } : veld
    );

    const onderdeelId = genereerId(onderdeelTemplate.naam, bestaandeOnderdeelIds);
    bestaandeOnderdeelIds.add(onderdeelId);
    onderdelen.push({
      id: onderdeelId,
      naam: onderdeelTemplate.naam,
      actief: true,
      order: orderIndex++,
      velden,
      afgeleideVariabelen: slice.afgeleideVariabelen,
      regels: slice.regels,
    });
  }

  const config: ModulaireCalculatorConfigData = {
    versie: 2,
    calculatorType: "CONFIGURATOR",
    onderdelen,
    resultaatInstellingen: legeModulaireCalculatorConfig().resultaatInstellingen,
  };

  await prisma.calculatorConfig.create({
    data: { toolId: tool.id, version: 1, status: "DRAFT", config: config as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/dashboard/tools");
  redirect(`/dashboard/tools/${tool.id}/bouwer`);
}

// Dupliceert een bestaande tool volledig (configuratie, producten,
// materiaalcategorieën/opties, prijzen, branding, resultaat-/
// leadformulierinstellingen) — maar NIET leads, offertes, analytics of de
// publicatiestatus. De kopie start altijd als CONCEPT met een eigen,
// gegarandeerd unieke slug; de oorspronkelijke tool blijft ongewijzigd.
export async function duplicateToolAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const toolId = formData.get("toolId");
  if (typeof toolId !== "string") return;

  const origineel = await prisma.tool.findFirst({
    where: { id: toolId, companyId: company.id, deletedAt: null },
    include: {
      branding: true,
      costSettings: true,
      products: {
        orderBy: { order: "asc" },
        include: {
          materiaalCategorieen: { orderBy: { order: "asc" }, include: { materialen: { orderBy: { order: "asc" } } } },
          extraOpties: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!origineel) return;

  if (!(await canCreateTool(company.id, effectiveTier(company)))) return;

  const naam = `${origineel.naam} (kopie)`;
  const slug = await generateUniqueToolSlug(company.id, naam);
  const order = await prisma.tool.count({ where: { companyId: company.id } });

  const kopie = await prisma.tool.create({
    data: {
      companyId: company.id,
      naam,
      slug,
      icoon: origineel.icoon,
      order,
      status: "CONCEPT",
      resultaatConfig: origineel.resultaatConfig as Prisma.InputJsonValue,
      leadFormConfig: origineel.leadFormConfig as Prisma.InputJsonValue,
      branding: origineel.branding
        ? {
            create: {
              logoUrl: origineel.branding.logoUrl,
              primaireKleur: origineel.branding.primaireKleur,
              achtergrondKleur: origineel.branding.achtergrondKleur,
              lettertype: origineel.branding.lettertype,
              customTitel: origineel.branding.customTitel,
              welkomstTekst: origineel.branding.welkomstTekst,
              bedankTekst: origineel.branding.bedankTekst,
              toonTelefoonnummer: origineel.branding.toonTelefoonnummer,
              telefoonnummer: origineel.branding.telefoonnummer,
              toonEmail: origineel.branding.toonEmail,
              contactPositie: origineel.branding.contactPositie,
              offerteIntroTekst: origineel.branding.offerteIntroTekst,
              offerteVoorwaardenTekst: origineel.branding.offerteVoorwaardenTekst,
              offerteGeldigheidsdagen: origineel.branding.offerteGeldigheidsdagen,
            },
          }
        : undefined,
      costSettings: origineel.costSettings
        ? {
            create: {
              arbeidEnabled: origineel.costSettings.arbeidEnabled,
              arbeidZichtbaar: origineel.costSettings.arbeidZichtbaar,
              arbeidStapEenheid: origineel.costSettings.arbeidStapEenheid,
              gebruiktAccountArbeidTarief: origineel.costSettings.gebruiktAccountArbeidTarief,
              arbeidTariefUur: origineel.costSettings.arbeidTariefUur,
              arbeidTariefDagdeel: origineel.costSettings.arbeidTariefDagdeel,
              arbeidTariefDag: origineel.costSettings.arbeidTariefDag,
              arbeidAfronden: origineel.costSettings.arbeidAfronden,
              transportEnabled: origineel.costSettings.transportEnabled,
              transportZichtbaar: origineel.costSettings.transportZichtbaar,
              transportTarief: origineel.costSettings.transportTarief,
              voorrijEnabled: origineel.costSettings.voorrijEnabled,
              voorrijZichtbaar: origineel.costSettings.voorrijZichtbaar,
              gebruiktAccountVoorrijTarief: origineel.costSettings.gebruiktAccountVoorrijTarief,
              voorrijTarief: origineel.costSettings.voorrijTarief,
              materiaalEnabled: origineel.costSettings.materiaalEnabled,
              materiaalZichtbaar: origineel.costSettings.materiaalZichtbaar,
              gebruiktAccountBtw: origineel.costSettings.gebruiktAccountBtw,
              btwPercentage: origineel.costSettings.btwPercentage,
              bandbreedteModus: origineel.costSettings.bandbreedteModus,
              bandbreedteMargeOmlaag: origineel.costSettings.bandbreedteMargeOmlaag,
              bandbreedteMargeOmhoog: origineel.costSettings.bandbreedteMargeOmhoog,
            },
          }
        : { create: {} },
      products: {
        create: origineel.products.map((product) => ({
          naam: product.naam,
          omschrijving: product.omschrijving,
          eenheid: product.eenheid,
          sjabloon: product.sjabloon,
          sjabloonConfig: product.sjabloonConfig as Prisma.InputJsonValue,
          productiviteit: product.productiviteit,
          arbeidTariefOverride: product.arbeidTariefOverride,
          transportkostenOverride: product.transportkostenOverride,
          transportMeeschalend: product.transportMeeschalend,
          voorrijkostenOverride: product.voorrijkostenOverride,
          voorrijMeeschalend: product.voorrijMeeschalend,
          icoon: product.icoon,
          actief: product.actief,
          order: product.order,
          materiaalCategorieen: {
            create: product.materiaalCategorieen.map((categorie) => ({
              naam: categorie.naam,
              verplicht: categorie.verplicht,
              order: categorie.order,
              materialen: {
                create: categorie.materialen.map((materiaal) => ({
                  naam: materiaal.naam,
                  prijs: materiaal.prijs,
                  prijsType: materiaal.prijsType,
                  prijsMin: materiaal.prijsMin,
                  prijsMax: materiaal.prijsMax,
                  stapgrootte: materiaal.stapgrootte,
                  productiviteitOverride: materiaal.productiviteitOverride,
                  foto: materiaal.foto,
                  actief: materiaal.actief,
                  order: materiaal.order,
                })),
              },
            })),
          },
          extraOpties: {
            create: product.extraOpties.map((extra) => ({
              naam: extra.naam,
              omschrijving: extra.omschrijving,
              prijs: extra.prijs,
              type: extra.type,
              foto: extra.foto,
              actief: extra.actief,
              order: extra.order,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/dashboard/tools");
  redirect(`/dashboard/tools/${kopie.id}`);
}

// Tool-instellingen (naam/icoon) — de slug blijft bewust onaangeroerd
// (verandert de publieke URL en embed, precies wat backwards compatibility
// juist moet voorkomen).
export async function updateToolAction(
  toolId: string,
  _prevState: ToolFormState,
  formData: FormData
): Promise<ToolFormState> {
  await requireActiveTool(toolId);

  const parsed = parseToolForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  await prisma.tool.update({
    where: { id: toolId },
    data: { naam: parsed.data.naam, icoon: parsed.data.icoon },
  });

  revalidatePath(`/dashboard/tools/${toolId}`);
  revalidatePath("/dashboard/tools");
  revalidatePath(`/dashboard/tools/${toolId}/instellingen`);
  return null;
}

// Publiceren/pauzeren/terug naar concept — zie ToolStatus in schema.prisma
// voor het publieke gedrag per status. Publiceren wordt server-side nogmaals
// tegen de abonnementslimiet gehouden (canPublishTool), niet alleen de UI.
export async function updateToolStatusAction(toolId: string, status: ToolStatus) {
  const { company, tool } = await requireActiveTool(toolId);

  if (status === "GEPUBLICEERD" && tool.status !== "GEPUBLICEERD") {
    if (!(await canPublishTool(company.id, effectiveTier(company)))) return;
  }

  await prisma.tool.update({ where: { id: toolId }, data: { status } });

  revalidatePath(`/dashboard/tools/${toolId}/publiceren`);
  revalidatePath(`/dashboard/tools/${toolId}`);
  revalidatePath("/dashboard/tools");
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
}

// Soft delete — zie Tool.deletedAt in schema.prisma. Historische leads/
// offertes/analytics blijven gewoon bestaan (Lead/Offerte/AnalyticsEvent
// worden hier bewust niet aangeraakt); de tool zelf verdwijnt uit elk
// normaal overzicht en is nergens meer publiek bereikbaar (requireActiveTool
// en getToolForPublicRoute filteren allebei op deletedAt: null).
export async function softDeleteToolAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const toolId = formData.get("toolId");
  if (typeof toolId !== "string") return;

  const tool = await prisma.tool.findFirst({
    where: { id: toolId, companyId: company.id, deletedAt: null },
    select: { slug: true },
  });
  if (!tool) return;

  await prisma.tool.update({ where: { id: toolId }, data: { deletedAt: new Date() } });

  revalidatePath("/dashboard/tools");
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
}

export type ToolResultaatFormState = { error?: string; success?: boolean } | null;

export async function updateResultaatConfigAction(
  toolId: string,
  _prevState: ToolResultaatFormState,
  formData: FormData
): Promise<ToolResultaatFormState> {
  const { company, tool } = await requireActiveTool(toolId);

  const parsed = toolResultaatConfigSchema.safeParse({
    prijsWeergave: formData.get("prijsWeergave"),
    afronding: formData.get("afronding"),
    ctaType: formData.get("ctaType"),
    ctaTekst: formData.get("ctaTekst") ?? "",
    toelichting: formData.get("toelichting") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  await prisma.tool.update({
    where: { id: toolId },
    data: {
      resultaatConfig: {
        prijsWeergave: parsed.data.prijsWeergave,
        afronding: parsed.data.afronding,
        ctaType: parsed.data.ctaType,
        ctaTekst: parsed.data.ctaTekst || null,
        toelichting: parsed.data.toelichting || null,
      } satisfies Prisma.InputJsonObject,
    },
  });

  revalidatePath(`/dashboard/tools/${toolId}/resultaat`);
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { success: true };
}

export async function updateLeadFormConfigAction(
  toolId: string,
  _prevState: ToolResultaatFormState,
  formData: FormData
): Promise<ToolResultaatFormState> {
  const { company, tool } = await requireActiveTool(toolId);

  const parsed = toolLeadFormConfigSchema.safeParse({
    vraagTelefoon: formData.get("vraagTelefoon") === "on",
    vraagAdres: formData.get("vraagAdres") === "on",
    vraagPostcode: formData.get("vraagPostcode") === "on",
    vraagHuisnummer: formData.get("vraagHuisnummer") === "on",
    vraagOpmerking: formData.get("vraagOpmerking") === "on",
  });
  if (!parsed.success) {
    return { error: "Ongeldige invoer" };
  }

  await prisma.tool.update({
    where: { id: toolId },
    data: { leadFormConfig: parsed.data satisfies Prisma.InputJsonObject },
  });

  revalidatePath(`/dashboard/tools/${toolId}/aanvraagformulier`);
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { success: true };
}

export async function updateEmbedConfigAction(
  toolId: string,
  _prevState: ToolResultaatFormState,
  formData: FormData
): Promise<ToolResultaatFormState> {
  await requireActiveTool(toolId);

  const parsed = toolEmbedConfigSchema.safeParse({
    breedte: formData.get("breedte"),
    vasteBreedtePx: formData.get("vasteBreedtePx"),
    minimaleHoogtePx: formData.get("minimaleHoogtePx"),
    transparanteAchtergrond: formData.get("transparanteAchtergrond") === "on",
    toonBorder: formData.get("toonBorder") === "on",
    radiusPx: formData.get("radiusPx"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  await prisma.tool.update({
    where: { id: toolId },
    data: { embedConfig: parsed.data satisfies Prisma.InputJsonObject },
  });

  revalidatePath(`/dashboard/tools/${toolId}/embed`);
  return { success: true };
}
