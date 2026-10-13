import type { Metadata } from "next";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { abonnementRegel } from "@/app/lib/profiel/samenvattingen";
import { laadAbonnementInvoer, laadProfiel } from "@/app/lib/profiel/laad";
import { effectiveTier } from "@/app/lib/subscription";
import { AbonnementView } from "@/app/dashboard/abonnement/abonnement-view";

export const metadata: Metadata = { title: "Abonnement" };

export default async function AbonnementPagina({ searchParams }: { searchParams: Promise<{ gewijzigd?: string; checkout?: string }> }) {
  const [{ company }, params] = await Promise.all([laadProfiel(), searchParams]);
  const regel = abonnementRegel(await laadAbonnementInvoer(company));
  return (
    <InstellingenPagina titel="Abonnement">
      <AbonnementView
        regel={regel}
        companyId={company.id}
        effectivePlan={effectiveTier(company)}
        isOverridden={company.overrideTier !== null}
        actualPlan={company.subscriptionTier}
        actualInterval={company.billingInterval}
        subscriptionStatus={company.subscriptionStatus}
        gewijzigd={params.gewijzigd === "1"}
        checkoutAfgerond={params.checkout === "afgerond"}
      />
    </InstellingenPagina>
  );
}
