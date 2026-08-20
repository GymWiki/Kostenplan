import type { Metadata } from "next";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { CostSettingsForm } from "./cost-settings-form";

export const metadata: Metadata = { title: "Prijzen" };

export default async function PrijzenPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company } = await requireActiveTool(toolId);

  // find-then-create (not upsert): CostSettings is already created bij het
  // aanmaken van de tool, dus deze fallback loopt bijna nooit — maar upserts
  // update-tak zou anders bij elke paginaweergave alsnog naar de rij
  // schrijven.
  const [costSettings, totaal, arbeidOverrides, transportOverrides, voorrijOverrides] = await Promise.all([
    prisma.costSettings.findUnique({ where: { toolId } }),
    prisma.product.count({ where: { toolId } }),
    prisma.product.count({ where: { toolId, arbeidTariefOverride: { not: null } } }),
    prisma.product.count({ where: { toolId, transportkostenOverride: { not: null } } }),
    prisma.product.count({ where: { toolId, voorrijkostenOverride: { not: null } } }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Prijzen
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bepaal welke kostenposten meetellen in deze rekentool en welke tarieven je hanteert.
        </p>
      </div>
      <CostSettingsForm
        toolId={toolId}
        costSettings={costSettings ?? (await prisma.costSettings.create({ data: { toolId } }))}
        accountDefaults={{
          standaardArbeidTariefUur: company.standaardArbeidTariefUur,
          standaardVoorrijTarief: company.standaardVoorrijTarief,
          standaardBtwPercentage: company.standaardBtwPercentage,
        }}
        productCounts={{ totaal, arbeidOverrides, transportOverrides, voorrijOverrides }}
      />
    </div>
  );
}
