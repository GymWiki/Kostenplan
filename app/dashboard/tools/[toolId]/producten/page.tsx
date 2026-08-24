import type { Metadata } from "next";
import { Package } from "lucide-react";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { Card, CardContent } from "@/app/components/ui/card";
import { NieuwItemButton } from "@/app/components/dashboard/nieuw-item-button";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { ProductenTable } from "./producten-table";

export const metadata: Metadata = { title: "Producten" };

export default async function ProductenPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company } = await requireActiveTool(toolId);

  const [products, totaalOverAlleTools] = await Promise.all([
    prisma.product.findMany({
      where: { toolId },
      orderBy: { order: "asc" },
      include: { _count: { select: { materiaalCategorieen: true, extraOpties: true } } },
    }),
    prisma.product.count({ where: { tool: { companyId: company.id } } }),
  ]);
  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  const atLimit = limiet !== null && totaalOverAlleTools >= limiet;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            Producten
          </h1>
          <p className="mt-1 text-muted-foreground">
            Samengestelde producten met materiaalkeuzes, bijv. een schutting met palen en
            tussenbekleding, of een vloer met tegels en voegmateriaal.
          </p>
        </div>
        <NieuwItemButton href={`/dashboard/tools/${toolId}/producten/nieuw`} label="Nieuw product" atLimit={atLimit} />
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">Nog geen producten</p>
              <p className="text-sm text-muted-foreground">
                Voeg een product toe en richt daarna de materiaalcategorieën en extra opties in.
              </p>
            </div>
            <NieuwItemButton
              href={`/dashboard/tools/${toolId}/producten/nieuw`}
              label="Nieuw product"
              atLimit={atLimit}
              variant="secondary"
            />
          </CardContent>
        </Card>
      ) : (
        <ProductenTable toolId={toolId} products={products} atLimit={atLimit} />
      )}
    </div>
  );
}
