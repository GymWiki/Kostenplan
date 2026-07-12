import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { CostSettingsForm } from "./cost-settings-form";

export const metadata: Metadata = { title: "Kosteninstellingen" };

export default async function InstellingenPage() {
  const user = await requireUser();

  const costSettings = await prisma.costSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

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
