import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { BrandHeader } from "@/app/components/ui/brand-header";
import { OnboardingStepIndicator } from "@/app/onboarding/step-indicator";
import { StartpakketForm } from "./startpakket-form";

export const metadata: Metadata = { title: "Welke werkzaamheden doe je?" };

export default async function OnboardingWerkzaamhedenPage() {
  const { company } = await requireActiveCompany();

  const tool = await prisma.tool.findFirst({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, costSettings: true },
  });
  if (!tool) redirect("/onboarding/rekentool");

  const [inTool, inBedrijf] = await Promise.all([
    prisma.product.count({ where: { toolId: tool.id } }),
    prisma.product.count({ where: { tool: { companyId: company.id } } }),
  ]);
  // Terugknop na het aanmaken: niet nog een keer hetzelfde startpakket tonen.
  if (inTool > 0) redirect("/onboarding/klaar");

  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  const ruimte = limiet === null ? null : Math.max(0, limiet - inBedrijf);
  const cs = tool.costSettings;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <BrandHeader />
      <OnboardingStepIndicator step={3} total={4} />
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Welke werkzaamheden doe je?</h1>
          <p className="mt-2 text-muted-foreground">
            Vink aan wat je doet. Ik zet het meteen voor je klaar met voorbeeldprijzen die je daarna naloopt.
          </p>
        </div>
        <StartpakketForm
          ruimte={ruimte}
          tarievenStart={{
            arbeidStapEenheid: cs?.arbeidStapEenheid,
            arbeidTariefUur: company.standaardArbeidTariefUur,
            arbeidTariefDagdeel: cs?.arbeidTariefDagdeel,
            arbeidTariefDag: cs?.arbeidTariefDag,
            voorrijTarief: company.standaardVoorrijTarief,
            transportTarief: cs?.transportTarief,
          }}
        />
      </div>
    </div>
  );
}
