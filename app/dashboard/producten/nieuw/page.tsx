import type { Metadata } from "next";
import { requireUser, getArbeidStapEenheid } from "@/app/lib/dal";
import { createProductAction } from "@/app/lib/actions/products";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nieuw product" };

export default async function NieuwProductPage() {
  const user = await requireUser();
  const arbeidStapEenheid = await getArbeidStapEenheid(user.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuw product</h1>
        <p className="mt-1 text-muted-foreground">
          Maak eerst de basis aan. Daarna voeg je materiaalcategorieën en extra opties toe.
        </p>
      </div>
      <ProductForm action={createProductAction} arbeidStapEenheid={arbeidStapEenheid} />
    </div>
  );
}
