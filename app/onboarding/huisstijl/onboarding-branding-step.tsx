"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { LinkButton, Button } from "@/app/components/ui/button";
import { AutoBranding, type AutoBrandingResult } from "@/app/dashboard/tools/[toolId]/uiterlijk/auto-branding";
import { applyOnboardingBrandingAction } from "@/app/lib/actions/onboarding";

// Het wow-moment: meteen na het aanmaken van een bedrijf, vóór het
// dashboard, een kans om de rekentool er in één keer verzorgd uit te laten
// zien. Bewust hetzelfde <AutoBranding>-component als op de losse
// brandingpagina (geen dubbele implementatie) — hier alleen ingepakt met een
// "opslaan en doorgaan"/"overslaan"-stap in plaats van het volledige
// brandingformulier.
export function OnboardingBrandingStep() {
  const [applied, setApplied] = useState<AutoBrandingResult | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <AutoBranding onApply={setApplied} magPersonaliserenUiterlijk={false} />

      <form action={applyOnboardingBrandingAction} className="flex flex-col gap-3 sm:flex-row-reverse">
        {applied?.primaireKleur && <input type="hidden" name="primaireKleur" value={applied.primaireKleur} />}
        {applied?.lettertype && <input type="hidden" name="lettertype" value={applied.lettertype} />}
        {applied?.logoUrl && <input type="hidden" name="logoUrl" value={applied.logoUrl} />}
        {applied?.customTitel && <input type="hidden" name="customTitel" value={applied.customTitel} />}
        {applied?.welkomstTekst && <input type="hidden" name="welkomstTekst" value={applied.welkomstTekst} />}
        <Button type="submit" size="lg" disabled={!applied} className="w-full sm:flex-1">
          Opslaan en doorgaan
          <ArrowRight className="h-4 w-4" />
        </Button>
        <LinkButton href="/dashboard" variant="outline" size="lg" className="w-full sm:flex-1">
          Overslaan, ik doe dit later
        </LinkButton>
      </form>
    </div>
  );
}
