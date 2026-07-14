"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { updateSubscriptionTierAction } from "@/app/lib/actions/branding";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Label, Select } from "@/app/components/ui/input";
import type { SubscriptionTier } from "@/app/generated/prisma/client";

const tierLabels: Record<SubscriptionTier, string> = {
  GRATIS: "Gratis",
  PLUS: "Plus",
  PRO: "Pro",
};

export function SubscriptionCard({ subscriptionTier }: { subscriptionTier: SubscriptionTier }) {
  const [state, formAction, pending] = useActionState(updateSubscriptionTierAction, null);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="font-semibold text-foreground">
            Huidig abonnement: {tierLabels[subscriptionTier]}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Facturatie is nog niet gekoppeld — kies hieronder alvast je plan om de
          personalisatie-opties (kleuren en lettertype) te ontgrendelen. Op Gratis blijft de
          &ldquo;Powered by Kostenplan&rdquo;-badge altijd zichtbaar op je rekentool.
        </p>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="subscriptionTier">Plan</Label>
            <Select id="subscriptionTier" name="subscriptionTier" defaultValue={subscriptionTier}>
              <option value="GRATIS">Gratis — basis, met Kostenplan-badge</option>
              <option value="PLUS">Plus — volledige personalisatie</option>
              <option value="PRO">Pro — volledige personalisatie</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Bezig…" : "Plan wijzigen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
