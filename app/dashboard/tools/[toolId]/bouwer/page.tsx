import type { Metadata } from "next";
import { requireDraftCalculatorConfig, getMateriaalOptiesVoorEngineVelden } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { parseCalculatorConfig } from "@/app/lib/calculator-engine";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { CalculatorBouwer } from "./calculator-bouwer";

export const metadata: Metadata = { title: "Calculator-bouwer" };

export default async function CalculatorBouwerPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool, draft } = await requireDraftCalculatorConfig(toolId);
  const config = parseCalculatorConfig(draft.config);

  const [branding, costSettings, creator] = await Promise.all([
    prisma.branding.findUnique({ where: { toolId } }),
    prisma.costSettings.findUnique({ where: { toolId } }),
    prisma.user.findUnique({ where: { id: company.createdBy }, select: { email: true } }),
  ]);

  const materialCategoryIds = config.velden
    .filter((veld) => veld.soort === "PRODUCT_KEUZE")
    .map((veld) => veld.materialCategoryId);
  const materiaalOpties = await getMateriaalOptiesVoorEngineVelden(toolId, materialCategoryIds);

  const effectieveCostSettings = costSettings ? resolveCostSettings(costSettings, company) : null;

  return (
    <CalculatorBouwer
      toolId={toolId}
      toolNaam={tool.naam}
      heeftLiveVersie={tool.activeCalculatorConfigId != null}
      initieleConfig={config}
      bedrijfsnaam={company.naam}
      email={creator?.email ?? ""}
      subscriptionTier={effectiveTier(company)}
      branding={branding}
      btwPercentage={effectieveCostSettings?.btwPercentage ?? company.standaardBtwPercentage}
      materiaalOpties={materiaalOpties}
    />
  );
}
