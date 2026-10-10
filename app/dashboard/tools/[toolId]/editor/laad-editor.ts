import { canCreateTool, canPublishTool, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolEmbedCode, getToolUrl } from "@/app/lib/url";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { parseEmbedConfig, parseLeadFormConfig, parseResultaatConfig } from "@/app/lib/tools";
import type { EditorProps } from "./rekentool-editor";

const GELDIGE_PANELEN = ["uiterlijk", "resultaat", "aanvraag", "website", "toevoegen", "aangepast", "account"];

// Alle gegevens voor de rekentool-editor. Gedeeld door /dashboard/tools/[id]
// en de gast-variant /probeer/editor: één editor, één manier om hem te vullen.
// Voor een gast (anonieme probeer-sessie) bestaat er geen embed-code, geen
// publicatie en geen tweede rekentool: die gegevens worden niet eens geladen.
export async function laadEditorProps(toolId: string, paneel: string | undefined, gast = false): Promise<EditorProps> {
  const { user, company, tool } = await requireActiveTool(toolId);
  // Een gast krijgt in het voorbeeld de volle huisstijl te zien (kleuren en
  // lettertype); na het account-maken geldt weer het gewone abonnement.
  const tier = gast ? "PLUS" : effectiveTier(company);

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
    gast
      ? Promise.resolve([])
      : prisma.tool.findMany({
          where: { companyId: company.id, deletedAt: null, id: { not: toolId } },
          orderBy: { order: "asc" },
          take: 50,
          select: { id: true, naam: true, products: { orderBy: { order: "asc" }, select: { id: true, naam: true } } },
        }),
    gast ? Promise.resolve(false) : canCreateTool(company.id, tier),
    gast ? Promise.resolve(false) : canPublishTool(company.id, tier),
  ]);

  const resultaat = parseResultaatConfig(tool.resultaatConfig);
  const aanvraag = parseLeadFormConfig(tool.leadFormConfig);
  const embedConfig = parseEmbedConfig(tool.embedConfig);
  const magEmbedden = !gast && PLAN_LIMITS[tier].embedEnabled;
  const [toolUrl, embedCode] = gast
    ? ["", null]
    : await Promise.all([getToolUrl(company.slug, tool.slug), magEmbedden ? getToolEmbedCode(toolId, tool.naam, embedConfig) : Promise.resolve(null)]);

  const startPaneel = paneel && (GELDIGE_PANELEN.includes(paneel) || paneel.startsWith("werkzaamheid:")) ? paneel : "start";

  return {
    toolId,
    toolNaam: tool.naam,
    toolStatus: tool.status,
    isAangepast: tool.activeCalculatorConfigId != null,
    products,
    branding,
    tier,
    email: user.email,
    resultaat: {
      arbeidZichtbaar: costSettings.arbeidZichtbaar,
      materiaalZichtbaar: costSettings.materiaalZichtbaar,
      transportZichtbaar: costSettings.transportZichtbaar,
      voorrijZichtbaar: costSettings.voorrijZichtbaar,
      toelichting: resultaat.toelichting ?? "",
      ctaTekst: resultaat.ctaTekst ?? "",
    },
    aanvraag: { vraagTelefoon: aanvraag.vraagTelefoon, bedankTekst: branding.bedankTekst },
    website: { toolUrl, embedCode, embedConfig, magEmbedden, magPubliceren, limiet: PLAN_LIMITS[tier].maxActiveTools },
    anderen: andereTools.map((t) => ({ id: t.id, naam: t.naam, werkzaamheden: t.products })),
    magNieuweTool,
    startPaneel,
  };
}
