"use server";

import { revalidatePath } from "next/cache";
import { getToolCostSettings, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { analyseerRekentool, type RekentoolAnalyse } from "@/app/lib/rekentool-analyse";
import { saveWerkzaamheidAction } from "@/app/lib/actions/werkzaamheden";

// "Aangepast" → standaardblokken. Eerst bekijken (alleen lezen, met het
// verschil in prijs), daarna pas bevestigen.
export async function bekijkOmzettingAction(toolId: string): Promise<RekentoolAnalyse> {
  const { company } = await requireActiveTool(toolId);
  const cs = await getToolCostSettings(toolId, company);
  return analyseerRekentool(toolId, cs);
}

export async function zetOmNaarStandaardblokkenAction(toolId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { company, tool } = await requireActiveTool(toolId);
  const cs = await getToolCostSettings(toolId, company);
  const analyse = await analyseerRekentool(toolId, cs);
  if (analyse.soort !== "ANALYSE") return { ok: false, error: "Deze rekentool kan niet worden omgezet." };

  const plannen = analyse.onderdelen.map((o) => ({
    productId: o.productId,
    draft: o.classificatie.soort === "STANDAARD" || o.classificatie.kanOmzetten ? o.classificatie.draft : null,
    naam: o.naam,
  }));
  const onbekend = plannen.find((p) => !p.productId || !p.draft);
  if (onbekend) return { ok: false, error: `“${onbekend.naam}” past niet in de standaardblokken. Zet de rest eerst om of laat deze rekentool zoals hij is.` };
  const ids = plannen.map((p) => p.productId!);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Twee delen van deze rekentool delen dezelfde materialen. Die kunnen niet automatisch worden omgezet." };

  for (const p of plannen) {
    const r = await saveWerkzaamheidAction(p.productId!, p.draft!);
    if (!r.ok) return { ok: false, error: `“${p.naam}” omzetten lukte niet: ${r.error}` };
  }
  // De oude opbouw blijft bewaard (leads verwijzen ernaar); de rekentool
  // rekent vanaf nu met de werkzaamheden.
  await prisma.$transaction([
    prisma.product.updateMany({ where: { id: { in: ids } }, data: { actief: true } }),
    prisma.tool.update({ where: { id: toolId }, data: { activeCalculatorConfigId: null } }),
  ]);
  revalidatePath(`/dashboard/tools/${toolId}`);
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true };
}
