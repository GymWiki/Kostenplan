"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { UpgradeModal } from "@/app/components/dashboard/upgrade-modal";
import { GRATIS_CATALOGUS_LIMIET } from "@/app/lib/subscription";

// Gebruikt op de Producten- en Diensten-lijstpagina's: navigeert normaal naar
// het aanmaakformulier, maar toont bij het bereiken van de Gratis-catalogus-
// limiet i.p.v. daarvan de upgrademodal (de server actions blokkeren het
// aanmaken zelf ook, dit is puur de UX-laag die dat vooraf al duidelijk maakt).
export function NieuwItemButton({
  href,
  label,
  atLimit,
  variant = "primary",
}: {
  href: string;
  label: string;
  atLimit: boolean;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);

  if (atLimit) {
    return (
      <>
        <Button type="button" variant={variant} onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
        <UpgradeModal
          open={open}
          onClose={() => setOpen(false)}
          requiredPlan="PLUS"
          title="Limiet van het Gratis-pakket bereikt"
          description={`Het Gratis-pakket biedt plek voor maximaal ${GRATIS_CATALOGUS_LIMIET} diensten en producten samen. Upgrade naar Plus of Pro voor onbeperkt diensten en producten.`}
        />
      </>
    );
  }

  return (
    <LinkButton href={href} variant={variant}>
      <Plus className="h-4 w-4" />
      {label}
    </LinkButton>
  );
}
