"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { WizardBasisStatus, WizardPricingSettings } from "./product-wizard";

// Performance-audit (Fase 2, P2.6): het product-wizardscherm (3 stappen) laadt bij elk bezoek aan .../producten/nieuw, ook vóórdat de
// vakman de eerste stap invult. `nieuw/page.tsx` is een Server Component —
// `ssr: false` mag daar niet direct, vandaar deze losse client-wrapper
// (zelfde patroon als calculator-bouwer-lazy.tsx).
const ProductWizardImpl = dynamic(() => import("./product-wizard").then((mod) => mod.ProductWizard), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  ),
});

export function ProductWizardLazy(props: { toolId: string; pricingSettings: WizardPricingSettings; basisStatus: WizardBasisStatus }) {
  return <ProductWizardImpl {...props} />;
}
