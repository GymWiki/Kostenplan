"use client";

import { Lock, X } from "lucide-react";
import { LinkButton, Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { PLAN_LABELS } from "@/app/lib/subscription";
import type { SubscriptionTier } from "@/app/generated/prisma/client";

// Herbruikbare paywall-modal: overal waar een gebruiker tegen een Plus/Pro-
// functie aanloopt in het dashboard, tonen we deze i.p.v. de functie zelf uit
// te voeren. Gestuurd door de aanroepende plek (open/onClose) zodat elke
// paywall zijn eigen trigger-knop/gedrag houdt.
export function UpgradeModal({
  open,
  onClose,
  requiredPlan,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  requiredPlan: SubscriptionTier;
  title: string;
  description: string;
}) {
  return (
    <Overlay open={open} onClose={onClose} ariaLabelledBy="upgrade-modal-title" className="flex items-center justify-center p-4">
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-4 top-4 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h2 id="upgrade-modal-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <LinkButton href="/dashboard/abonnement" size="lg" className="w-full sm:flex-1" onClick={onClose}>
            Upgrade naar {PLAN_LABELS[requiredPlan]}
          </LinkButton>
          <Button type="button" variant="secondary" size="lg" className="w-full sm:flex-1" onClick={onClose}>
            Misschien later
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
