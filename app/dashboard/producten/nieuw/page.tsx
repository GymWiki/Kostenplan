import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { createProductAction } from "@/app/lib/actions/products";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nieuw product" };

export default async function NieuwProductPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuw product</h1>
        <p className="mt-1 text-muted-foreground">
          Voeg een materiaal of product toe aan je aanbod.
        </p>
      </div>
      <ProductForm action={createProductAction} categories={categories} />
    </div>
  );
}
