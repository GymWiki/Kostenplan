import type { Metadata } from "next";
import { requireActiveTool, getProductPricingSettings, getBasisTarievenStatus } from "@/app/lib/dal";
import { ProductWizardLazy } from "./product-wizard-lazy";

export const metadata: Metadata = { title: "Nieuwe werkzaamheid" };

export default async function NieuwProductPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company } = await requireActiveTool(toolId);
  const [pricingSettings, basisStatus] = await Promise.all([
    getProductPricingSettings(toolId, company),
    getBasisTarievenStatus(toolId, company),
  ]);

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuwe werkzaamheid</h1>
        <p className="mt-1 text-muted-foreground">In drie stappen staat je werkzaamheid klaar.</p>
      </div>
      <ProductWizardLazy toolId={toolId} pricingSettings={pricingSettings} basisStatus={basisStatus} />
    </div>
  );
}
