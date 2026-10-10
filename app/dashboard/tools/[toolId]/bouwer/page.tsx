import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveTool, requireDraftCalculatorConfig, getMateriaalOptiesVoorEngineVelden, getOnderdeelBibliotheekVoorCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { parseCalculatorConfig, alleVeldenVanConfig } from "@/app/lib/calculator-engine";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { CalculatorBouwerLazy } from "./calculator-bouwer-lazy";
import { OnderdelenBouwerLazy } from "./onderdelen-bouwer-lazy";

export const metadata: Metadata = { title: "Calculator-bouwer" };

export default async function CalculatorBouwerPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;

  // UX-audit punt 2: Bouwer (het oude vragen/prijsregels-systeem) en
  // Producten (het huidige kostengebaseerde systeem) mogen nooit tegelijk
  // een tegenstrijdig beeld geven voor dezelfde tool. Een tool die al
  // Producten heeft én nog nooit een CalculatorConfig heeft gepubliceerd
  // (activeCalculatorConfigId is dan null) gebruikt Bouwer niet — de lege
  // "nog geen vragen"-staat die anders hier zou verschijnen is dan gewoon
  // onwaar (de tool staat al live via Producten) en dus verwarrend i.p.v.
  // informatief. Toon in dat geval een duidelijke uitleg i.p.v. de builder.
  // Bewust vóór requireDraftCalculatorConfig (die anders al een lege
  // DRAFT-rij aanmaakt door alleen al deze pagina te bezoeken).
  const { tool } = await requireActiveTool(toolId);
  const productCount = await prisma.product.count({ where: { toolId } });

  if (productCount > 0 && tool.activeCalculatorConfigId == null) {
    redirect(`/dashboard/tools/${toolId}`);
  }

  const { company, draft } = await requireDraftCalculatorConfig(toolId);
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
      <OnderdelenBouwerLazy
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
    <CalculatorBouwerLazy
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
