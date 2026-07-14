"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { costSettingsSchema } from "@/app/lib/validation";

export type CostSettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
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
    arbeidStapEenheid: formData.get("arbeidStapEenheid"),
    arbeidTarief: formData.get("arbeidTarief"),
    arbeidTariefPerProduct: formData.get("arbeidTariefPerProduct") === "on",

    transportEnabled: formData.get("transportEnabled") === "on",
    transportZichtbaar: formData.get("transportZichtbaar") === "on",

    voorrijEnabled: formData.get("voorrijEnabled") === "on",
    voorrijZichtbaar: formData.get("voorrijZichtbaar") === "on",
    voorrijTarief: formData.get("voorrijTarief"),

    materiaalEnabled: formData.get("materiaalEnabled") === "on",
    materiaalZichtbaar: formData.get("materiaalZichtbaar") === "on",
    materiaalMarge: formData.get("materiaalMarge"),
    materiaalMargePerProduct: formData.get("materiaalMargePerProduct") === "on",

    btwPercentage: formData.get("btwPercentage"),

    bandbreedteModus: formData.get("bandbreedteModus") || "GEEN",
    bandbreedteMargeOmlaag: formData.get("bandbreedteMargeOmlaag") ?? 10,
    bandbreedteMargeOmhoog: formData.get("bandbreedteMargeOmhoog") ?? 10,
  };

  const parsed = costSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return {
      error: "Controleer de ingevulde waarden en probeer het opnieuw.",
      fieldErrors,
    };
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
