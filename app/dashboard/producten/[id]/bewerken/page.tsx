import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { updateProductAction } from "@/app/lib/actions/products";
import { ProductForm } from "../../product-form";
import { MaterialCategoriesManager } from "./material-categories-manager";
import { ExtraOptionsManager } from "./extra-options-manager";

export const metadata: Metadata = { title: "Product bewerken" };

export default async function BewerkProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id, userId: user.id },
    include: {
      materiaalCategorieen: {
        orderBy: { order: "asc" },
        include: { materialen: { orderBy: { order: "asc" } } },
      },
      extraOpties: { orderBy: { order: "asc" } },
    },
  });

  if (!product) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Product bewerken</h1>
          <p className="mt-1 text-muted-foreground">Werk de gegevens van dit product bij.</p>
        </div>
        <ProductForm action={updateProductAction.bind(null, product.id)} product={product} />
      </div>

      <MaterialCategoriesManager
        productId={product.id}
        categories={product.materiaalCategorieen}
      />

      <ExtraOptionsManager productId={product.id} extraOpties={product.extraOpties} />
    </div>
  );
}
