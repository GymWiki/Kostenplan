import { prisma } from "@/app/lib/prisma";
import { parseLeadFormConfig, parseResultaatConfig } from "@/app/lib/tools";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { Calculator } from "@/app/portaal/[slug]/calculator";
import type { Company, Tool } from "@/app/generated/prisma/client";

// Dezelfde <Calculator>-renderer als de publieke pagina's (/t/..., /embed/...,
// /portaal/...) — geen aparte previewcomponent, dus dit toont altijd precies
// wat een klant ook zou zien, ongeacht publicatiestatus. Gedeeld door de
// calculator-voorbeeldpagina en de laatste onboarding-stap.
export async function ToolCalculatorPreview({ company, tool }: { company: Company; tool: Tool }) {
  const toolId = tool.id;
  const [branding, costSettings, products, creator] = await Promise.all([
    prisma.branding.findUnique({ where: { toolId } }),
    prisma.costSettings.findUnique({ where: { toolId } }),
    prisma.product.findMany({
      where: { toolId, actief: true },
      orderBy: { order: "asc" },
      include: {
        materiaalCategorieen: {
          orderBy: { order: "asc" },
          include: { materialen: { where: { actief: true }, orderBy: { order: "asc" } } },
        },
        extraOpties: { where: { actief: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.user.findUnique({ where: { id: company.createdBy }, select: { email: true } }),
  ]);

  if (!costSettings) return null;

  return (
    <Calculator
      toolId={tool.id}
      bedrijfsnaam={company.naam}
      email={creator?.email ?? ""}
      subscriptionTier={effectiveTier(company)}
      branding={branding}
      costSettings={resolveCostSettings(costSettings, company)}
      products={products}
      toelichting={parseResultaatConfig(tool.resultaatConfig).toelichting}
      ctaTekst={parseResultaatConfig(tool.resultaatConfig).ctaTekst}
      vraagTelefoon={parseLeadFormConfig(tool.leadFormConfig).vraagTelefoon}
    />
  );
}
