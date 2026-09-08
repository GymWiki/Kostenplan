"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { CalculatorConfigData } from "@/app/lib/calculator-engine";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import type { Branding, SubscriptionTier } from "@/app/generated/prisma/client";

// Performance-audit (Fase 2, P1.1): CalculatorBouwer trekt @dnd-kit en
// ~1300 regels tab-logica (velden-tab.tsx/regels-tab.tsx e.a.) synchroon
// mee zodra deze pagina laadt, ook vóórdat de vakman iets sleept. `bouwer/
// page.tsx` is een Server Component — `ssr: false` mag daar niet direct
// (Next verbiedt dat buiten Client Components) — vandaar deze losse
// client-wrapper die de echte lazy-load doet, met een skeleton die de
// vaste chrome (header/tabs) van het echte component benadert.
const CalculatorBouwerImpl = dynamic(
  () => import("./calculator-bouwer").then((mod) => mod.CalculatorBouwer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[560px] w-full rounded-xl" />
      </div>
    ),
  }
);

export function CalculatorBouwerLazy(props: {
  toolId: string;
  toolNaam: string;
  heeftLiveVersie: boolean;
  initieleConfig: CalculatorConfigData;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  btwPercentage: number;
  materiaalOpties: Record<string, MateriaalOptie[]>;
}) {
  return <CalculatorBouwerImpl {...props} />;
}
