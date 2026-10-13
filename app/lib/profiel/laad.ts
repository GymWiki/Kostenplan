import "server-only";
import { getToolCostSettings, requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { parseWerkgebied } from "@/app/lib/werkgebied/schema";

// Gedeelde gegevens voor Profiel en zijn detailpagina's. Alleen lezen; niets wordt hier aangepast.
export async function laadProfiel() {
  const { user, company, alleBedrijven } = await requireActiveCompany();
  const tools = await prisma.tool.findMany({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, naam: true, branding: { select: { logoUrl: true, primaireKleur: true } } },
  });
  const offertegegevens = await laadOfferteGegevens(company);
  return { user, company, alleBedrijven, tools, offertegegevens, werkgebied: parseWerkgebied(company.werkgebied) };
}

export async function laadTarieven(company: Awaited<ReturnType<typeof laadProfiel>>["company"], toolId: string | undefined) {
  const kosten = toolId ? await getToolCostSettings(toolId, company) : null;
  const eenheid = kosten?.arbeidStapEenheid ?? "DAGDEEL";
  const tarief = kosten ? (eenheid === "UUR" ? kosten.arbeidTariefUur : eenheid === "DAG" ? kosten.arbeidTariefDag : kosten.arbeidTariefDagdeel) : 180;
  return { eenheid, tarief, voorrij: kosten?.voorrijTarief ?? company.standaardVoorrijTarief, transport: kosten?.transportTarief ?? 0 };
}

export async function laadAbonnementInvoer(company: Awaited<ReturnType<typeof laadProfiel>>["company"]) {
  const plan = effectiveTier(company);
  const gebruikt = await prisma.product.count({ where: { tool: { companyId: company.id } } });
  return {
    plan,
    handmatigToegekend: company.overrideTier !== null,
    status: company.subscriptionStatus,
    periodeEind: company.huidigePeriodeEind,
    gepauzeerdTot: company.gepauzeerdTot,
    gebruikteOnderdelen: gebruikt,
    limietOnderdelen: PLAN_LIMITS[plan].maxProductsPerCompany,
  };
}

export const abonnementLoopt = (status: string) => !["GEEN", "CANCELED", "COMPLETED"].includes(status);
