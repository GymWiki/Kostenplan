import type { Metadata } from "next";
import { canCreateTool, canPublishTool, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolEmbedCode, getToolUrl } from "@/app/lib/url";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { parseEmbedConfig, parseLeadFormConfig, parseResultaatConfig } from "@/app/lib/tools";
import { RekentoolEditor } from "./editor/rekentool-editor";

export const metadata: Metadata = { title: "Rekentool bewerken" };

// De rekentool-editor: één scherm waarin de hovenier zijn rekentool ziet zoals
// de klant en elk onderdeel aanpast door erop te klikken. Vervangt de oude
// tool-navigatie (Overzicht, Calculator, Bouwer, Werkzaamheden, Prijzen,
// Uiterlijk, Resultaat, Aanvraagformulier, Publiceren, Embed, Instellingen).
export default async function RekentoolEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ paneel?: string }>;
}) {
  const { toolId } = await params;
  const { paneel } = await searchParams;
  const { user, company, tool } = await requireActiveTool(toolId);
  const tier = effectiveTier(company);

  const [products, branding, costSettings, andereTools, magNieuweTool, magPubliceren] = await Promise.all([
    prisma.product.findMany({
      where: { toolId },
      orderBy: { order: "asc" },
      take: 200,
      include: {
        materiaalCategorieen: { orderBy: { order: "asc" }, include: { materialen: { orderBy: { order: "asc" } } } },
        extraOpties: { orderBy: { order: "asc" } },
      },
    }),
    // find-then-create: een gewone paginaweergave schrijft niets.
    prisma.branding.findUnique({ where: { toolId } }).then((b) => b ?? prisma.branding.create({ data: { toolId } })),
    prisma.costSettings.findUnique({ where: { toolId } }).then((c) => c ?? prisma.costSettings.create({ data: { toolId } })),
    prisma.tool.findMany({
      where: { companyId: company.id, deletedAt: null, id: { not: toolId } },
      orderBy: { order: "asc" },
      take: 50,
      select: { id: true, naam: true, products: { orderBy: { order: "asc" }, select: { id: true, naam: true } } },
    }),
    canCreateTool(company.id, tier),
    canPublishTool(company.id, tier),
  ]);

  const resultaat = parseResultaatConfig(tool.resultaatConfig);
  const aanvraag = parseLeadFormConfig(tool.leadFormConfig);
  const embedConfig = parseEmbedConfig(tool.embedConfig);
  const magEmbedden = PLAN_LIMITS[tier].embedEnabled;
  const [toolUrl, embedCode] = await Promise.all([
    getToolUrl(company.slug, tool.slug),
    magEmbedden ? getToolEmbedCode(toolId, tool.naam, embedConfig) : Promise.resolve(null),
  ]);

  const isAangepast = tool.activeCalculatorConfigId != null;
  const geldigePanelen = ["uiterlijk", "resultaat", "aanvraag", "website", "toevoegen", "aangepast"];
  const startPaneel =
    paneel && (geldigePanelen.includes(paneel) || paneel.startsWith("werkzaamheid:")) ? paneel : "start";

  return (
    <RekentoolEditor
      toolId={toolId}
      toolNaam={tool.naam}
      toolStatus={tool.status}
      isAangepast={isAangepast}
      products={products}
      branding={branding}
      tier={tier}
      email={user.email}
      resultaat={{
        arbeidZichtbaar: costSettings.arbeidZichtbaar,
        materiaalZichtbaar: costSettings.materiaalZichtbaar,
        transportZichtbaar: costSettings.transportZichtbaar,
        voorrijZichtbaar: costSettings.voorrijZichtbaar,
        toelichting: resultaat.toelichting ?? "",
        ctaTekst: resultaat.ctaTekst ?? "",
      }}
      aanvraag={{ vraagTelefoon: aanvraag.vraagTelefoon, bedankTekst: branding.bedankTekst }}
      website={{ toolUrl, embedCode, embedConfig, magEmbedden, magPubliceren, limiet: PLAN_LIMITS[tier].maxActiveTools }}
      anderen={andereTools.map((t) => ({ id: t.id, naam: t.naam, werkzaamheden: t.products }))}
      magNieuweTool={magNieuweTool}
      startPaneel={startPaneel}
    />
  );
}
