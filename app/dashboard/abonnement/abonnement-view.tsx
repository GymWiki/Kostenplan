"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { startCheckoutAction, type CheckoutFormState } from "@/app/lib/actions/subscription";
import { Button } from "@/app/components/ui/button";
import { SettingsGroup, SettingsInfoRow } from "@/app/components/instellingen/settings";
import type { AbonnementRegel } from "@/app/lib/profiel/samenvattingen";
import { PricingTable } from "@/app/components/pricing/pricing-table";
import { HelpTip } from "@/app/components/ui/help-tip";
import { CancelRetentionModal } from "@/app/components/dashboard/cancel-retention-modal";
import { PLAN_LABELS } from "@/app/lib/subscription";
import type {
  BillingInterval,
  MollieSubscriptionStatus,
  SubscriptionTier,
} from "@/app/generated/prisma/client";

export function AbonnementView({
  regel,
  companyId,
  effectivePlan,
  isOverridden,
  actualPlan,
  actualInterval,
  subscriptionStatus,
  gewijzigd,
  checkoutAfgerond,
}: {
  regel: AbonnementRegel;
  companyId: string;
  effectivePlan: SubscriptionTier;
  isOverridden: boolean;
  actualPlan: SubscriptionTier;
  actualInterval: BillingInterval | null;
  subscriptionStatus: MollieSubscriptionStatus;
  gewijzigd: boolean;
  checkoutAfgerond: boolean;
}) {
  const isActiveSubscription = subscriptionStatus === "ACTIVE";

  return (
    <div className="flex flex-col gap-8">
      {(gewijzigd || checkoutAfgerond) && (
        <div className="flex items-center gap-2 rounded-md border border-accent bg-accent/50 px-4 py-3 text-sm text-accent-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {checkoutAfgerond
            ? "Bedankt! Zodra Mollie de betaling heeft bevestigd, wordt je pakket automatisch bijgewerkt."
            : "Je abonnement is gewijzigd."}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SettingsGroup>
          <SettingsInfoRow icoon={CreditCard} titel="Abonnement" samenvatting={regel.letOp ? undefined : regel.tekst} waarschuwing={regel.letOp ? regel.tekst : null} />
        </SettingsGroup>
        {isOverridden && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Deze toegang is handmatig toegekend en staat los van een eventueel betaald abonnement hieronder.
            <HelpTip contentKey="abonnement.overrideTier" />
          </p>
        )}
        {regel.opnieuwAbonneren && (
          <a href="#pakketten" className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Opnieuw abonneren
          </a>
        )}
      </div>

      <h2 id="pakketten" className="flex scroll-mt-20 items-center gap-2 font-semibold text-foreground">
        Kies je pakket
        <HelpTip contentKey="abonnement.upgradeDowngrade" />
      </h2>

      <PricingTable
        currentPlan={effectivePlan}
        defaultInterval={actualInterval ?? "MAANDELIJKS"}
        renderCta={(plan, interval) => (
          <CheckoutButton
            companyId={companyId}
            plan={plan}
            interval={interval}
            actualPlan={actualPlan}
            actualInterval={actualInterval}
            isActiveSubscription={isActiveSubscription}
          />
        )}
      />
    </div>
  );
}

function CheckoutButton({
  companyId,
  plan,
  interval,
  actualPlan,
  actualInterval,
  isActiveSubscription,
}: {
  companyId: string;
  plan: SubscriptionTier;
  interval: BillingInterval;
  actualPlan: SubscriptionTier;
  actualInterval: BillingInterval | null;
  isActiveSubscription: boolean;
}) {
  const [state, formAction, pending] = useActionState<CheckoutFormState, FormData>(
    startCheckoutAction,
    null
  );
  const [retentieOpen, setRetentieOpen] = useState(false);

  const isHuidig =
    plan === actualPlan &&
    (plan === "GRATIS" || (isActiveSubscription && interval === actualInterval));

  let label: string;
  let variant: "primary" | "secondary" | "outline" = "primary";
  if (isHuidig) {
    label = "Huidig pakket";
    variant = "secondary";
  } else if (plan === "GRATIS") {
    label = "Downgrade naar Gratis";
    variant = "outline";
  } else if (plan === actualPlan && isActiveSubscription) {
    label = interval === "JAARLIJKS" ? "Wijzig naar jaarlijks" : "Wijzig naar maandelijks";
  } else {
    label = `Kies ${PLAN_LABELS[plan]}`;
  }

  // Downgraden naar Gratis vanaf een betaald pakket = opzeggen — daar hangt
  // de retentie-flow tussenin, in plaats van meteen te submitten. Alle
  // andere knoppen (upgraden, wisselen van interval, of Gratis kiezen als
  // je al Gratis bent) blijven een gewone directe submit.
  if (plan === "GRATIS" && actualPlan !== "GRATIS" && !isHuidig) {
    return (
      <>
        <Button type="button" variant={variant} onClick={() => setRetentieOpen(true)} className="w-full">
          {label}
        </Button>
        <CancelRetentionModal
          open={retentieOpen}
          onClose={() => setRetentieOpen(false)}
          companyId={companyId}
          actualPlan={actualPlan}
          actualInterval={actualInterval}
        />
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant={variant} disabled={isHuidig || pending} className="w-full">
        {pending ? "Bezig…" : label}
      </Button>
    </form>
  );
}
