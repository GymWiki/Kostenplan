"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { ModulaireCalculatorConfigData } from "@/app/lib/calculator-engine";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import type { Branding, SubscriptionTier, OnderdeelBibliotheek } from "@/app/generated/prisma/client";

// Zelfde reden als calculator-bouwer-lazy.tsx: OnderdelenBouwer trekt
// @dnd-kit + builder-tree.tsx/veld-settings-form.tsx/regel-settings-form.tsx
// (~1600 regels) synchroon mee. Lazy-load met een skeleton i.p.v. dat op elk
// bezoek aan /bouwer meteen mee te sturen.
const OnderdelenBouwerImpl = dynamic(
  () => import("./onderdelen-bouwer").then((mod) => mod.OnderdelenBouwer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-[560px] rounded-xl lg:col-span-1" />
          <Skeleton className="h-[560px] rounded-xl lg:col-span-2" />
        </div>
      </div>
    ),
  }
);

export function OnderdelenBouwerLazy(props: {
  toolId: string;
  toolNaam: string;
  heeftLiveVersie: boolean;
  initieleConfig: ModulaireCalculatorConfigData;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  btwPercentage: number;
  materiaalOpties: Record<string, MateriaalOptie[]>;
  initieleOnderdeelBibliotheek: OnderdeelBibliotheek[];
}) {
  return <OnderdelenBouwerImpl {...props} />;
}
