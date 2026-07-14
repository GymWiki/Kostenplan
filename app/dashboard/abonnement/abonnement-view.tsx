"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { startCheckoutAction, type CheckoutFormState } from "@/app/lib/actions/subscription";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import { PricingTable } from "@/app/components/pricing/pricing-table";
import { PLAN_LABELS } from "@/app/lib/subscription";
import type {
  BillingInterval,
  MollieSubscriptionStatus,
  SubscriptionTier,
} from "@/app/generated/prisma/client";

const STATUS_LABELS: Record<MollieSubscriptionStatus, string> = {
  GEEN: "Geen actief abonnement",
  PENDING: "Betaling wordt verwerkt",
  ACTIVE: "Actief",
  CANCELED: "Opgezegd",
  SUSPENDED: "Opgeschort — betaling mislukt",
  COMPLETED: "Afgerond",
};

export function AbonnementView({
  effectivePlan,
  isOverridden,
  actualPlan,
  actualInterval,
  subscriptionStatus,
  huidigePeriodeEindLabel,
  gewijzigd,
  checkoutAfgerond,
}: {
  effectivePlan: SubscriptionTier;
  isOverridden: boolean;
  actualPlan: SubscriptionTier;
  actualInterval: BillingInterval | null;
  subscriptionStatus: MollieSubscriptionStatus;
  huidigePeriodeEindLabel: string | null;
  gewijzigd: boolean;
  checkoutAfgerond: boolean;
}) {
  const isActiveSubscription = subscriptionStatus === "ACTIVE";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Abonnement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beheer je pakket en betaalperiode. Betalingen verlopen veilig via Mollie.
        </p>
      </div>

      {(gewijzigd || checkoutAfgerond) && (
        <div className="flex items-center gap-2 rounded-md border border-accent bg-accent/50 px-4 py-3 text-sm text-accent-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {checkoutAfgerond
            ? "Bedankt! Zodra Mollie de betaling heeft bevestigd, wordt je pakket automatisch bijgewerkt."
            : "Je abonnement is gewijzigd."}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              Huidig pakket: {PLAN_LABELS[effectivePlan]}
            </p>
            {isOverridden && <Badge variant="default">Handmatig toegekend</Badge>}
            {!isOverridden && actualPlan !== "GRATIS" && (
              <Badge variant={isActiveSubscription ? "success" : "warning"}>
                {STATUS_LABELS[subscriptionStatus]}
              </Badge>
            )}
          </div>
          {isOverridden ? (
            <p className="text-sm text-muted-foreground">
              Deze toegang is handmatig toegekend en staat los van een eventueel betaald
              abonnement hieronder.
            </p>
          ) : (
            isActiveSubscription &&
            huidigePeriodeEindLabel && (
              <p className="text-sm text-muted-foreground">
                Betaalperiode: {actualInterval === "JAARLIJKS" ? "jaarlijks" : "maandelijks"} —
                volgende betaling rond {huidigePeriodeEindLabel}.
              </p>
            )
          )}
        </CardContent>
      </Card>

      <PricingTable
        currentPlan={effectivePlan}
        defaultInterval={actualInterval ?? "MAANDELIJKS"}
        renderCta={(plan, interval) => (
          <CheckoutButton
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
  plan,
  interval,
  actualPlan,
  actualInterval,
  isActiveSubscription,
}: {
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
