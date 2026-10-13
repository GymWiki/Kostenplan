import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { BrandHeader } from "@/app/components/ui/brand-header";
import { LinkButton } from "@/app/components/ui/button";
import { ToolCalculatorPreview } from "@/app/components/dashboard/tool-calculator-preview";
import { OnboardingStepIndicator } from "@/app/onboarding/step-indicator";
import { HOVENIER_PRESETS, VOORBEELD_LABEL } from "@/app/lib/presets";

export const metadata: Metadata = { title: "Je rekentool staat klaar" };

export default async function OnboardingKlaarPage({
  searchParams,
}: {
  searchParams: Promise<{ over?: string }>;
}) {
  const { company } = await requireActiveCompany();
  const { over } = await searchParams;

  const tool = await prisma.tool.findFirst({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!tool) redirect("/onboarding/rekentool");

  const aantal = await prisma.product.count({ where: { toolId: tool.id } });
  if (aantal === 0) redirect("/onboarding/onderdelen");

  // Alleen bekende preset-ids tonen — de querystring is gebruikersinvoer.
  const overIds = new Set((over ?? "").split(","));
  const overPresets = HOVENIER_PRESETS.filter((p) => overIds.has(p.id));

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <BrandHeader />
      <OnboardingStepIndicator step={4} total={4} />
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Je rekentool staat klaar</h1>
          <p className="mt-2 text-muted-foreground">
            Zo ziet je klant het. De prijzen zijn nog voorbeeldprijzen: loop ze na zodat ze kloppen met jouw tarieven.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <LinkButton href={`/dashboard/tools/${tool.id}`} size="lg" className="w-full sm:flex-1">
            Prijzen nalopen
          </LinkButton>
          <LinkButton href="/dashboard" variant="outline" size="lg" className="w-full sm:flex-1">
            Later, naar mijn dashboard
          </LinkButton>
        </div>

        {overPresets.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary/40 p-3 sm:p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              Meer onderdelen met een upgrade
            </p>
            <p className="break-words text-sm text-muted-foreground">
              Past niet in je huidige pakket: {overPresets.map((p) => p.naam).join(", ")}.
            </p>
            <LinkButton href="/dashboard/profiel/abonnement" variant="outline" className="w-full sm:w-fit">
              Bekijk de pakketten
            </LinkButton>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-center text-xs text-muted-foreground">Voorbeeld — {VOORBEELD_LABEL}</p>
          <ToolCalculatorPreview company={company} tool={tool} />
        </div>
      </div>
    </div>
  );
}
