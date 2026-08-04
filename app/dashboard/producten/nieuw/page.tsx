import type { Metadata } from "next";
import { ProductWizard } from "./product-wizard";

export const metadata: Metadata = { title: "Nieuw product" };

export default function NieuwProductPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuw product</h1>
        <p className="mt-1 text-muted-foreground">In een paar stappen staat je product live.</p>
      </div>
      <ProductWizard />
    </div>
  );
}
