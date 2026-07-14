import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { effectiveTier } from "@/app/lib/subscription";
import { AbonnementView } from "./abonnement-view";

export const metadata: Metadata = { title: "Abonnement" };

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ gewijzigd?: string; checkout?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);

  return (
    <AbonnementView
      effectivePlan={effectiveTier(user)}
      isOverridden={user.overrideTier !== null}
      actualPlan={user.subscriptionTier}
      actualInterval={user.billingInterval}
      subscriptionStatus={user.subscriptionStatus}
      huidigePeriodeEindLabel={
        user.huidigePeriodeEind
          ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(
              user.huidigePeriodeEind
            )
          : null
      }
      gewijzigd={params.gewijzigd === "1"}
      checkoutAfgerond={params.checkout === "afgerond"}
    />
  );
}
