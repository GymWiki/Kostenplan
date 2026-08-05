import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { BrandHeader } from "@/app/components/ui/brand-header";
import { OnboardingStepIndicator } from "@/app/onboarding/step-indicator";
import { OnboardingBrandingStep } from "./onboarding-branding-step";

export const metadata: Metadata = { title: "Je huisstijl instellen" };

export default async function OnboardingHuisstijlPage() {
  // Alleen om in te loggen te bevestigen en het net aangemaakte bedrijf als
  // actief te hebben (zie createCompanyAction) — de stap zelf werkt op elk
  // bedrijf, ongeacht welk dat is.
  await requireActiveCompany();

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <BrandHeader />
      <OnboardingStepIndicator step={2} total={2} />
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Vul je website in en wij stellen automatisch je huisstijl in
          </h1>
          <p className="mt-2 text-muted-foreground">
            Kleuren, logo en teksten in een paar seconden — je kunt alles hierna nog aanpassen,
            of deze stap gewoon overslaan.
          </p>
        </div>
        <OnboardingBrandingStep />
      </div>
    </div>
  );
}
