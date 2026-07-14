import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { effectiveTier } from "@/app/lib/subscription";
import { AbonnementView } from "./abonnement-view";

export const metadata: Metadata = { title: "Abonnement" };

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ gewijzigd?: string; checkout?: string }>;
}) {
  const [{ company }, params] = await Promise.all([requireActiveCompany(), searchParams]);

  return (
    <AbonnementView
      effectivePlan={effectiveTier(company)}
      isOverridden={company.overrideTier !== null}
      actualPlan={company.subscriptionTier}
      actualInterval={company.billingInterval}
      subscriptionStatus={company.subscriptionStatus}
      huidigePeriodeEindLabel={
        company.huidigePeriodeEind
          ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(
              company.huidigePeriodeEind
            )
          : null
      }
      gewijzigd={params.gewijzigd === "1"}
      checkoutAfgerond={params.checkout === "afgerond"}
    />
  );
}
