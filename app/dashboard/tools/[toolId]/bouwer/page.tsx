import type { Metadata } from "next";
import { requireDraftCalculatorConfig, getMateriaalOptiesVoorEngineVelden, getOnderdeelBibliotheekVoorCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { parseCalculatorConfig, alleVeldenVanConfig } from "@/app/lib/calculator-engine";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { CalculatorBouwer } from "./calculator-bouwer";
import { OnderdelenBouwer } from "./onderdelen-bouwer";

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

  const materialCategoryIds = alleVeldenVanConfig(config)
    .filter((veld) => veld.soort === "PRODUCT_KEUZE")
    .map((veld) => veld.materialCategoryId);
  const materiaalOpties = await getMateriaalOptiesVoorEngineVelden(toolId, materialCategoryIds);

  const effectieveCostSettings = costSettings ? resolveCostSettings(costSettings, company) : null;
  const btwPercentage = effectieveCostSettings?.btwPercentage ?? company.standaardBtwPercentage;

  // Levering B v2 (Deel 5): een tool met een versie-2 (modulaire)
  // configuratie krijgt de nieuwe Onderdelen-bouwer; een tool met een
  // bestaande versie-1 configuratie blijft op de ongewijzigde, oorspronkelijke
  // CalculatorBouwer draaien — geen migratie, geen breaking change.
  if (config.versie === 2) {
    const onderdeelBibliotheek = await getOnderdeelBibliotheekVoorCompany(company.id);
    return (
      <OnderdelenBouwer
        toolId={toolId}
        toolNaam={tool.naam}
        heeftLiveVersie={tool.activeCalculatorConfigId != null}
        initieleConfig={config}
        bedrijfsnaam={company.naam}
        email={creator?.email ?? ""}
        subscriptionTier={effectiveTier(company)}
        branding={branding}
        btwPercentage={btwPercentage}
        materiaalOpties={materiaalOpties}
        initieleOnderdeelBibliotheek={onderdeelBibliotheek}
      />
    );
  }

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
      btwPercentage={btwPercentage}
      materiaalOpties={materiaalOpties}
    />
  );
}
