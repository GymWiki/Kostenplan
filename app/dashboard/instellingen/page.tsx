import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { CostSettingsForm } from "./cost-settings-form";

export const metadata: Metadata = { title: "Kosteninstellingen" };

export default async function InstellingenPage() {
  const { company } = await requireActiveCompany();

  // find-then-create (not upsert): CostSettings is already created at
  // sign-up, so this fallback almost never runs — but upsert's update
  // branch would otherwise write to the row on every single page view.
  const costSettings =
    (await prisma.costSettings.findUnique({ where: { companyId: company.id } })) ??
    (await prisma.costSettings.create({ data: { companyId: company.id } }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Kosteninstellingen
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bepaal welke kostenposten meetellen in de calculator en welke tarieven je hanteert.
        </p>
      </div>
      <CostSettingsForm costSettings={costSettings} />
    </div>
  );
}
