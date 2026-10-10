import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveTool, getProductPricingSettings } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { updateProductDraftAction } from "@/app/lib/actions/products";
import { ProductForm } from "../../product-form";
import { MaterialCategoriesManager } from "../bewerken/material-categories-manager";
import { ExtraOptionsManager } from "../bewerken/extra-options-manager";
import { HelpTip } from "@/app/components/ui/help-tip";
import { LinkButton } from "@/app/components/ui/button";

export const metadata: Metadata = { title: "Onderdeel bewerken (uitgebreid)" };

export default async function BewerkProductPage({
  params,
}: {
  params: Promise<{ toolId: string; id: string }>;
}) {
  const { toolId, id } = await params;
  const { company } = await requireActiveTool(toolId);

  const [product, pricingSettings] = await Promise.all([
    prisma.product.findFirst({
      where: { id, toolId },
      include: {
        materiaalCategorieen: {
          orderBy: { order: "asc" },
          include: { materialen: { orderBy: { order: "asc" } } },
        },
        extraOpties: { orderBy: { order: "asc" } },
      },
    }),
    getProductPricingSettings(toolId, company),
  ]);

  if (!product) notFound();

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          Uitgebreid bewerken
          <HelpTip contentKey="producten.opbouw" />
        </h1>
        <p className="mt-1 text-muted-foreground">
          Alle instellingen van dit onderdeel, inclusief de uitzonderingen die het gewone scherm niet laat zien.
        </p>
        <LinkButton href={`/dashboard/tools/${toolId}/producten/${id}/bewerken`} variant="outline" className="mt-3">
          Terug naar het gewone scherm
        </LinkButton>
      </div>
      <ProductForm
        toolId={toolId}
        // Dit scherm heeft geen submit-knop — elke wijziging slaat via
        // autosave op (zie scheduleAutosave in product-form.tsx). Gebruik
        // daarom de niet-doorsturende variant, anders stuurt elke autosave
        // de gebruiker terug naar het productenoverzicht (bug).
        action={updateProductDraftAction.bind(null, product.id)}
        product={product}
        pricingSettings={pricingSettings}
        materialenSectie={
          <MaterialCategoriesManager
            productId={product.id}
            productEenheid={product.eenheid}
            categories={product.materiaalCategorieen}
          />
        }
        extraOptiesSectie={
          <ExtraOptionsManager
            productId={product.id}
            productEenheid={product.eenheid}
            extraOpties={product.extraOpties}
          />
        }
      />
    </div>
  );
}
