import type { Metadata } from "next";
import { requireActiveCompany, canCreateTool, listToolsVoorCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolUrl } from "@/app/lib/url";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { RekentoolsLijst } from "./rekentools-lijst";

export const metadata: Metadata = { title: "Rekentools" };

export default async function ToolsOverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ verwijderd?: string; naam?: string }>;
}) {
  const { company } = await requireActiveCompany();
  const { verwijderd, naam } = await searchParams;
  const tier = effectiveTier(company);

  const tools = await listToolsVoorCompany(company.id);
  const beginVanMaand = new Date();
  beginVanMaand.setDate(1);
  beginVanMaand.setHours(0, 0, 0, 0);

  const [magNieuweTool, toolUrls, leadsPerTool, nieuwePerToolRijen] = await Promise.all([
    canCreateTool(company.id, tier),
    Promise.all(tools.map((tool) => getToolUrl(company.slug, tool.slug))),
    prisma.lead.groupBy({
      by: ["toolId"],
      where: { companyId: company.id, createdAt: { gte: beginVanMaand } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["toolId"],
      where: { companyId: company.id, status: "NIEUW" },
      _count: { _all: true },
    }),
  ]);
  const perTool = new Map(leadsPerTool.map((r) => [r.toolId, r._count._all]));
  const nieuwePerTool = new Map(nieuwePerToolRijen.map((r) => [r.toolId, r._count._all]));

  return (
    <RekentoolsLijst
      tools={tools.map((t, i) => ({
        id: t.id,
        naam: t.naam,
        live: t.status === "GEPUBLICEERD",
        aantalWerkzaamheden: t._count.products,
        leadsDezeMaand: perTool.get(t.id) ?? 0,
        nieuweLeads: nieuwePerTool.get(t.id) ?? 0,
        toolUrl: toolUrls[i],
      }))}
      magNieuweTool={magNieuweTool}
      limiet={PLAN_LIMITS[tier].maxActiveTools}
      verwijderd={verwijderd && naam ? { id: verwijderd, naam } : null}
    />
  );
}
