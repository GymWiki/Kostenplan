"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canCreateTool, requireActiveCompany, requireActiveTool } from "@/app/lib/dal";
import { generateUniqueToolSlug } from "@/app/lib/slug";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import type { Prisma } from "@/app/generated/prisma/client";

// Acties van de rekentool-editor en het Rekentools-overzicht. Retourneren
// { ok } i.p.v. te redirecten, zodat de UI zelf een melding met "Ongedaan
// maken" kan tonen.

export type Resultaat = { ok: true } | { ok: false; error: string };

function ververs(toolId: string, company: { slug: string }, toolSlug: string) {
  revalidatePath("/dashboard/tools");
  revalidatePath(`/dashboard/tools/${toolId}`);
  revalidatePath(`/t/${company.slug}/${toolSlug}`);
  revalidatePath(`/portaal/${company.slug}`);
}

export async function hernoemRekentoolAction(toolId: string, naam: string): Promise<Resultaat> {
  const { company, tool } = await requireActiveTool(toolId);
  const schoon = naam.trim();
  if (schoon.length < 2) return { ok: false, error: "Geef je rekentool een naam van minstens 2 tekens." };
  if (schoon.length > 80) return { ok: false, error: "Die naam is te lang (maximaal 80 tekens)." };
  await prisma.tool.update({ where: { id: toolId }, data: { naam: schoon } });
  ververs(toolId, company, tool.slug);
  return { ok: true };
}

export async function verwijderRekentoolAction(toolId: string): Promise<Resultaat> {
  const { company, tool } = await requireActiveTool(toolId);
  await prisma.tool.update({ where: { id: toolId }, data: { deletedAt: new Date() } });
  ververs(toolId, company, tool.slug);
  return { ok: true };
}

// "Ongedaan maken" na verwijderen. Alleen voor een tool van dit bedrijf die
// zacht-verwijderd is (requireActiveTool weigert die, dus zelf controleren).
export async function herstelRekentoolAction(toolId: string): Promise<Resultaat> {
  const { company } = await requireActiveCompany();
  const tool = await prisma.tool.findFirst({ where: { id: toolId, companyId: company.id, deletedAt: { not: null } }, select: { slug: true } });
  if (!tool) return { ok: false, error: "Deze rekentool kan niet meer worden teruggezet." };
  await prisma.tool.update({ where: { id: toolId }, data: { deletedAt: null } });
  ververs(toolId, company, tool.slug);
  return { ok: true };
}

export async function zetWerkzaamhedenVolgordeAction(toolId: string, ids: string[]): Promise<Resultaat> {
  await requireActiveTool(toolId);
  const bestaand = await prisma.product.findMany({ where: { toolId }, select: { id: true } });
  const geldig = new Set(bestaand.map((p) => p.id));
  const lijst = ids.filter((id) => geldig.has(id));
  await prisma.$transaction(lijst.map((id, order) => prisma.product.update({ where: { id }, data: { order } })));
  return { ok: true };
}

const resultaatSchema = z.object({
  arbeidZichtbaar: z.boolean(),
  materiaalZichtbaar: z.boolean(),
  transportZichtbaar: z.boolean(),
  voorrijZichtbaar: z.boolean(),
  toelichting: z.string().max(300),
  ctaTekst: z.string().max(60),
});

// Paneel "Resultaat": welke regels de klant ziet, toelichting onder de prijs
// en de tekst op de knop.
export async function slaResultaatPaneelOpAction(toolId: string, invoer: z.infer<typeof resultaatSchema>): Promise<Resultaat> {
  const { company, tool } = await requireActiveTool(toolId);
  const p = resultaatSchema.safeParse(invoer);
  if (!p.success) return { ok: false, error: "Controleer de teksten: de toelichting mag maximaal 300 tekens zijn, de knoptekst 60." };
  const { toelichting, ctaTekst, ...zichtbaar } = p.data;
  const huidig = (tool.resultaatConfig && typeof tool.resultaatConfig === "object" ? tool.resultaatConfig : {}) as Record<string, unknown>;
  await prisma.$transaction([
    prisma.costSettings.update({ where: { toolId }, data: zichtbaar }),
    prisma.tool.update({
      where: { id: toolId },
      data: { resultaatConfig: { ...huidig, toelichting: toelichting.trim() || null, ctaTekst: ctaTekst.trim() || null } as Prisma.InputJsonValue },
    }),
  ]);
  ververs(toolId, company, tool.slug);
  return { ok: true };
}

const aanvraagSchema = z.object({ vraagTelefoon: z.boolean(), bedankTekst: z.string().max(300) });

// Paneel "Aanvraagformulier": telefoonnummer vragen en de bedankttekst.
export async function slaAanvraagPaneelOpAction(toolId: string, invoer: z.infer<typeof aanvraagSchema>): Promise<Resultaat> {
  const { company, tool } = await requireActiveTool(toolId);
  const p = aanvraagSchema.safeParse(invoer);
  if (!p.success) return { ok: false, error: "De bedankttekst mag maximaal 300 tekens zijn." };
  const huidig = (tool.leadFormConfig && typeof tool.leadFormConfig === "object" ? tool.leadFormConfig : {}) as Record<string, unknown>;
  await prisma.$transaction([
    prisma.tool.update({ where: { id: toolId }, data: { leadFormConfig: { ...huidig, vraagTelefoon: p.data.vraagTelefoon } as Prisma.InputJsonValue } }),
    prisma.branding.upsert({
      where: { toolId },
      create: { toolId, ...(p.data.bedankTekst.trim() ? { bedankTekst: p.data.bedankTekst.trim() } : {}) },
      update: p.data.bedankTekst.trim() ? { bedankTekst: p.data.bedankTekst.trim() } : {},
    }),
  ]);
  ververs(toolId, company, tool.slug);
  return { ok: true };
}

// Kopieert een werkzaamheid (met materialen en extra's) van een andere
// rekentool van hetzelfde bedrijf naar deze rekentool.
export async function kopieerWerkzaamheidAction(
  bronProductId: string,
  doelToolId: string
): Promise<{ ok: true; productId: string } | { ok: false; error: string }> {
  const { company, tool } = await requireActiveTool(doelToolId);
  const bron = await prisma.product.findFirst({
    where: { id: bronProductId, tool: { companyId: company.id, deletedAt: null } },
    include: { materiaalCategorieen: { include: { materialen: true } }, extraOpties: true },
  });
  if (!bron) return { ok: false, error: "Deze werkzaamheid bestaat niet meer." };

  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  if (limiet !== null && (await prisma.product.count({ where: { tool: { companyId: company.id } } })) >= limiet) {
    return { ok: false, error: `Je hebt de limiet van ${limiet} werkzaamheden voor het Gratis-pakket bereikt.` };
  }
  const order = await prisma.product.count({ where: { toolId: doelToolId } });
  const kopie = await prisma.product.create({
    data: {
      toolId: doelToolId,
      naam: bron.naam,
      omschrijving: bron.omschrijving,
      eenheid: bron.eenheid,
      sjabloon: bron.sjabloon,
      sjabloonConfig: bron.sjabloonConfig as Prisma.InputJsonValue,
      productiviteit: bron.productiviteit,
      arbeidTariefOverride: bron.arbeidTariefOverride,
      transportkostenOverride: bron.transportkostenOverride,
      transportMeeschalend: bron.transportMeeschalend,
      transportPerDag: bron.transportPerDag,
      voorrijkostenOverride: bron.voorrijkostenOverride,
      voorrijMeeschalend: bron.voorrijMeeschalend,
      icoon: bron.icoon,
      actief: true,
      order,
      materiaalCategorieen: {
        create: bron.materiaalCategorieen.map((c) => ({
          naam: c.naam,
          verplicht: c.verplicht,
          order: c.order,
          materialen: {
            create: c.materialen.map((m) => ({
              naam: m.naam,
              prijs: m.prijs,
              prijsType: m.prijsType,
              prijsMin: m.prijsMin,
              prijsMax: m.prijsMax,
              stapgrootte: m.stapgrootte,
              productiviteitOverride: m.productiviteitOverride,
              foto: m.foto,
              actief: m.actief,
              isVoorbeeld: m.isVoorbeeld,
              order: m.order,
            })),
          },
        })),
      },
      extraOpties: {
        create: bron.extraOpties.map((e) => ({
          naam: e.naam,
          omschrijving: e.omschrijving,
          prijs: e.prijs,
          type: e.type,
          altijd: e.altijd,
          foto: e.foto,
          actief: e.actief,
          order: e.order,
        })),
      },
    },
    select: { id: true },
  });
  ververs(doelToolId, company, tool.slug);
  return { ok: true, productId: kopie.id };
}

// "+ Nieuwe rekentool": alleen een naam, daarna direct de editor in (met de
// presetkiezer open). Volgt de bedrijfstarieven en begint als concept.
export async function maakRekentoolAction(naam: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const schoon = naam.trim();
  if (schoon.length < 2) return { ok: false, error: "Geef je rekentool een naam van minstens 2 tekens." };
  if (schoon.length > 80) return { ok: false, error: "Die naam is te lang (maximaal 80 tekens)." };
  const tier = effectiveTier(company);
  if (!(await canCreateTool(company.id, tier))) {
    const limiet = PLAN_LIMITS[tier].maxActiveTools;
    return { ok: false, error: `Je hebt de limiet van ${limiet} rekentool${limiet === 1 ? "" : "s"} voor je huidige pakket bereikt. Upgrade om meer rekentools te maken.` };
  }
  const slug = await generateUniqueToolSlug(company.id, schoon);
  const order = await prisma.tool.count({ where: { companyId: company.id } });
  // Tarieven gelden voor al je rekentools: neem ze over van de eerste.
  const bestaand = await prisma.costSettings.findFirst({
    where: { tool: { companyId: company.id, deletedAt: null } },
    orderBy: { tool: { order: "asc" } },
    select: { arbeidStapEenheid: true, arbeidTariefUur: true, arbeidTariefDagdeel: true, arbeidTariefDag: true, voorrijTarief: true, transportTarief: true },
  });
  const tool = await prisma.tool.create({
    data: { companyId: company.id, naam: schoon, icoon: "", slug, order, costSettings: { create: bestaand ?? {} }, branding: { create: {} } },
    select: { id: true },
  });
  revalidatePath("/dashboard/tools");
  return { ok: true, id: tool.id };
}
