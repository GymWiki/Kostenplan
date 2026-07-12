"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { costSettingsSchema } from "@/app/lib/validation";

export type CostSettingsFormState = {
  error?: string;
  success?: boolean;
} | null;

export async function updateCostSettingsAction(
  _prevState: CostSettingsFormState,
  formData: FormData
): Promise<CostSettingsFormState> {
  const user = await requireUser();

  const raw = {
    arbeidEnabled: formData.get("arbeidEnabled") === "on",
    arbeidZichtbaar: formData.get("arbeidZichtbaar") === "on",
    arbeidTarief: formData.get("arbeidTarief"),

    transportEnabled: formData.get("transportEnabled") === "on",
    transportZichtbaar: formData.get("transportZichtbaar") === "on",
    transportType: formData.get("transportType"),
    transportTarief: formData.get("transportTarief"),

    voorrijEnabled: formData.get("voorrijEnabled") === "on",
    voorrijZichtbaar: formData.get("voorrijZichtbaar") === "on",
    voorrijTarief: formData.get("voorrijTarief"),

    materiaalEnabled: formData.get("materiaalEnabled") === "on",
    materiaalZichtbaar: formData.get("materiaalZichtbaar") === "on",
    materiaalMarge: formData.get("materiaalMarge"),

    btwPercentage: formData.get("btwPercentage"),
  };

  const parsed = costSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Controleer de ingevulde waarden en probeer het opnieuw." };
  }

  await prisma.costSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/dashboard/instellingen");
  revalidatePath("/dashboard");
  revalidatePath(`/portaal/${user.slug}`);

  return { success: true };
}
