import { after } from "next/server";
import { canCreateTool, canPublishTool, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolEmbedCode, getToolUrl } from "@/app/lib/url";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { parseEmbedConfig, parseLeadFormConfig, parseResultaatConfig } from "@/app/lib/tools";
import { blobGeconfigureerd } from "@/app/lib/snapshot/opslag";
import type { EditorProps } from "./rekentool-editor";

const GELDIGE_PANELEN = ["uiterlijk", "resultaat", "aanvraag", "website", "toevoegen", "aangepast", "account"];

// Alle gegevens voor de rekentool-editor van een ingelogde hovenier. (De gast-
// variant in /probeer heeft geen database en vult de editor zelf, uit de browser.)
export async function laadEditorProps(toolId: string, paneel: string | undefined): Promise<EditorProps> {
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

  // Liep een eerdere publicatie vast (bijv. opslag even onbereikbaar)? Dan
  // proberen we het nu stilletjes opnieuw, zonder dat de editor erop wacht.
  if (tool.snapshotVuil && blobGeconfigureerd()) {
    after(async () => {
      const { publiceerMetHerhaling } = await import("@/app/lib/snapshot/publiceer");
      await publiceerMetHerhaling(toolId);
    });
  }

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
    publicatie: { actief: blobGeconfigureerd(), vuil: tool.snapshotVuil, fout: tool.snapshotFout },
  };
}
