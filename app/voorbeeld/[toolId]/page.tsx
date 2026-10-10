import type { Metadata } from "next";
import { getMateriaalOptiesVoorEngineVelden, getToolCostSettings, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { alleVeldenVanConfig, parseCalculatorConfig, publicCalculatorConfig } from "@/app/lib/calculator-engine";
import { VoorbeeldClient } from "./voorbeeld-client";

export const metadata: Metadata = { title: "Voorbeeld", robots: { index: false, follow: false } };

// De echte klant-rekentool voor de editor: dezelfde Calculator-component en
// dezelfde rekenlogica als /t/…, maar zonder publicatie-check en met de
// gegevens die de editor live doorgeeft (postMessage). Staat bewust buiten
// /dashboard zodat de app-navigatie er niet omheen komt, en wordt in een
// iframe getoond zodat de breakpoints (mobiel/desktop) echt kloppen.
export default async function VoorbeeldPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const { tool, company, user } = await requireActiveTool(toolId);

  const [products, branding, costSettings] = await Promise.all([
    prisma.product.findMany({
      where: { toolId },
      orderBy: { order: "asc" },
      take: 200,
      include: {
        materiaalCategorieen: { orderBy: { order: "asc" }, include: { materialen: { orderBy: { order: "asc" } } } },
        extraOpties: { orderBy: { order: "asc" } },
      },
    }),
    prisma.branding.findUnique({ where: { toolId } }),
    getToolCostSettings(toolId, company),
  ]);

  let engine = null;
  if (tool.activeCalculatorConfigId) {
    const actief = await prisma.calculatorConfig.findUnique({ where: { id: tool.activeCalculatorConfigId } });
    if (actief) {
      const config = publicCalculatorConfig(parseCalculatorConfig(actief.config));
      const ids = alleVeldenVanConfig(config)
        .filter((v) => v.soort === "PRODUCT_KEUZE")
        .map((v) => v.materialCategoryId);
      engine = { config, materiaalOpties: await getMateriaalOptiesVoorEngineVelden(toolId, ids) };
    }
  }

  return (
    <VoorbeeldClient
      toolId={toolId}
      bedrijfsnaam={company.naam}
      email={user.email}
      subscriptionTier={effectiveTier(company)}
      initieel={{ products, branding, costSettings }}
      engine={engine}
    />
  );
}
