import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { BrandHeader } from "@/app/components/ui/brand-header";
import { OnboardingStepIndicator } from "@/app/onboarding/step-indicator";
import { OnboardingToolForm } from "./onboarding-tool-form";

export const metadata: Metadata = { title: "Je eerste rekentool" };

export default async function OnboardingRekentoolPage() {
  const { company } = await requireActiveCompany();

  // Iemand die hier terugkomt nadat de eerste tool al is aangemaakt (bijv.
  // via de browser-terugknop) hoort meteen door te gaan naar de huisstijl-
  // stap in plaats van nog een keer een rekentool te kunnen aanmaken.
  const heeftAlTool = await prisma.tool.findFirst({
    where: { companyId: company.id, deletedAt: null },
    select: { id: true },
  });
  if (heeftAlTool) {
    redirect("/onboarding/huisstijl");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <BrandHeader />
      <OnboardingStepIndicator step={2} total={3} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1" className="text-xl">
            Je eerste rekentool
          </CardTitle>
          <CardDescription>
            Een rekentool is wat je klant invult om een prijsindicatie te krijgen. Je kunt er
            later meer aanmaken.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingToolForm />
        </CardContent>
      </Card>
    </div>
  );
}
