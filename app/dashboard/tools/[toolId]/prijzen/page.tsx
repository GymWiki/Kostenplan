import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { CostSettingsForm } from "./cost-settings-form";

export const metadata: Metadata = { title: "Prijsinstellingen" };

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
    <div className="flex max-w-[820px] flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/tools/${toolId}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Terug naar je rekentool
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Btw en andere prijsinstellingen
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bepaal welke kostenposten meetellen in deze rekentool, de btw en hoe de prijs wordt getoond. Je tarieven pas je aan in je profiel.
        </p>
      </div>
      <CostSettingsForm
        // Nieuw formulier zodra de eenheid of de tarieven veranderen (bijv. na het omrekenen), zodat de velden de actuele waarden tonen.
        key={`${costSettings?.arbeidStapEenheid}-${costSettings?.arbeidTariefUur}-${costSettings?.arbeidTariefDagdeel}-${costSettings?.arbeidTariefDag}`}
        toolId={toolId}
        costSettings={costSettings ?? (await prisma.costSettings.create({ data: { toolId } }))}
        accountDefaults={{
          standaardArbeidTariefUur: company.standaardArbeidTariefUur,
          standaardVoorrijTarief: company.standaardVoorrijTarief,
          standaardBtwPercentage: company.standaardBtwPercentage,
          urenPerDagdeel: company.urenPerDagdeel,
          urenPerDag: company.urenPerDag,
        }}
        productCounts={{ totaal, arbeidOverrides, transportOverrides, voorrijOverrides }}
      />
    </div>
  );
}
