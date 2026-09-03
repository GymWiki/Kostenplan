import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveTool, getProductPricingSettings } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { updateProductDraftAction } from "@/app/lib/actions/products";
import { ProductForm } from "../../product-form";
import { MaterialCategoriesManager } from "./material-categories-manager";
import { ExtraOptionsManager } from "./extra-options-manager";
import { HelpTip } from "@/app/components/ui/help-tip";

export const metadata: Metadata = { title: "Product bewerken" };

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
          Product bewerken
          <HelpTip contentKey="producten.opbouw" />
        </h1>
        <p className="mt-1 text-muted-foreground">Werk de gegevens van dit product bij.</p>
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
