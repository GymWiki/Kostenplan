"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { UpgradeModal } from "@/app/components/dashboard/upgrade-modal";

// Zelfde patroon als NieuwItemButton (producten), maar voor de rekentool-
// limiet i.p.v. de productcatalogus-limiet — zie PLAN_LIMITS.maxActiveTools
// in app/lib/subscription.ts. De server actions (createToolAction) blokkeren
// het aanmaken zelf ook; dit is puur de UX-laag die dat vooraf al duidelijk maakt.
export function NieuweRekentoolKnop({
  atLimit,
  limiet,
  variant = "primary",
}: {
  atLimit: boolean;
  limiet: number | null;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);

  if (atLimit) {
    return (
      <>
        <Button type="button" variant={variant} onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nieuwe rekentool
        </Button>
        <UpgradeModal
          open={open}
          onClose={() => setOpen(false)}
          requiredPlan="PLUS"
          title="Limiet van rekentools bereikt"
          description={
            limiet
              ? `Je huidige pakket biedt plek voor maximaal ${limiet} actieve rekentool${limiet === 1 ? "" : "s"}. Upgrade voor meer rekentools.`
              : "Upgrade je pakket om meer rekentools te kunnen aanmaken."
          }
        />
      </>
    );
  }

  return (
    <LinkButton href="/dashboard/tools/nieuw" variant={variant}>
      <Plus className="h-4 w-4" />
      Nieuwe rekentool
    </LinkButton>
  );
}
