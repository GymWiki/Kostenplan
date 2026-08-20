import type { Metadata } from "next";
import { Eye } from "lucide-react";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { Calculator } from "@/app/portaal/[slug]/calculator";

export const metadata: Metadata = { title: "Calculator-voorbeeld" };

// Dezelfde <Calculator>-renderer als de publieke pagina's (/t/..., /embed/...,
// /portaal/...) — geen aparte previewcomponent, dus deze pagina laat altijd
// precies zien wat een klant ook zou zien, ongeacht publicatiestatus.
export default async function ToolCalculatorPreviewPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool } = await requireActiveTool(toolId);

  const [branding, costSettings, products] = await Promise.all([
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
  ]);

  const creator = await prisma.user.findUnique({ where: { id: company.createdBy }, select: { email: true } });
  const effectieveCostSettings = costSettings ? resolveCostSettings(costSettings, company) : null;


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4 shrink-0" />
        Dit is een voorbeeld van hoe &ldquo;{tool.naam}&rdquo; eruitziet voor je klant.
      </div>
      {effectieveCostSettings && (
        <Calculator
          toolId={tool.id}
          bedrijfsnaam={company.naam}
          email={creator?.email ?? ""}
          subscriptionTier={effectiveTier(company)}
          branding={branding}
          costSettings={effectieveCostSettings}
          products={products}
        />
      )}
    </div>
  );
}
