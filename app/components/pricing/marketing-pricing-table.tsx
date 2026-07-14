"use client";

import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { PricingTable } from "@/app/components/pricing/pricing-table";

// Wrapper rond de gedeelde PricingTable voor de publieke, uitgelogde
// /prijzen-pagina — hier is nog geen account, dus alle knoppen leiden naar
// registreren. Het daadwerkelijke pakket kiezen/betalen gebeurt na het
// inloggen op /dashboard/abonnement (zie CheckoutButton daar).
export function MarketingPricingTable() {
  return (
    <PricingTable
      renderCta={(plan) => (
        <LinkButton href="/registreren" className="w-full" variant={plan === "GRATIS" ? "outline" : "primary"}>
          {plan === "GRATIS" ? "Start gratis" : "Kies dit pakket"}
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
      )}
    />
  );
}
