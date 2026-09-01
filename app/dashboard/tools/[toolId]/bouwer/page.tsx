import type { Metadata } from "next";
import { Blocks } from "lucide-react";
import { requireActiveTool, requireDraftCalculatorConfig, getMateriaalOptiesVoorEngineVelden, getOnderdeelBibliotheekVoorCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { parseCalculatorConfig, alleVeldenVanConfig } from "@/app/lib/calculator-engine";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { CalculatorBouwer } from "./calculator-bouwer";
import { OnderdelenBouwer } from "./onderdelen-bouwer";

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
    return <BouwerNietInGebruikMelding toolId={toolId} />;
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

function BouwerNietInGebruikMelding({ toolId }: { toolId: string }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Blocks className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-foreground">Deze rekentool is opgebouwd met Producten</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bouwer is een ouder, vragen-gebaseerd systeem dat deze tool niet gebruikt — je prijzen,
            vragen en berekeningen beheer je hier via Producten. Er is dus niets om hier in te
            richten.
          </p>
        </div>
        <LinkButton href={`/dashboard/tools/${toolId}/producten`} size="sm" className="mt-1">
          Naar Producten
        </LinkButton>
      </CardContent>
    </Card>
  );
}
