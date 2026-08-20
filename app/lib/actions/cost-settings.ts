"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { costSettingsSchema } from "@/app/lib/validation";

export type CostSettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

export async function updateCostSettingsAction(
  toolId: string,
  _prevState: CostSettingsFormState,
  formData: FormData
): Promise<CostSettingsFormState> {
  const { company, tool } = await requireActiveTool(toolId);

  const raw = {
    arbeidEnabled: formData.get("arbeidEnabled") === "on",
    arbeidZichtbaar: formData.get("arbeidZichtbaar") === "on",
    arbeidStapEenheid: formData.get("arbeidStapEenheid"),
    arbeidTariefUur: formData.get("arbeidTariefUur"),
    arbeidTariefDagdeel: formData.get("arbeidTariefDagdeel"),
    arbeidTariefDag: formData.get("arbeidTariefDag"),
    arbeidAfronden: formData.get("arbeidAfronden") === "on",

    transportEnabled: formData.get("transportEnabled") === "on",
    transportZichtbaar: formData.get("transportZichtbaar") === "on",
    transportTarief: formData.get("transportTarief"),

    voorrijEnabled: formData.get("voorrijEnabled") === "on",
    voorrijZichtbaar: formData.get("voorrijZichtbaar") === "on",
    voorrijTarief: formData.get("voorrijTarief"),

    materiaalEnabled: formData.get("materiaalEnabled") === "on",
    materiaalZichtbaar: formData.get("materiaalZichtbaar") === "on",

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

  // Account-defaults-cascade (zie resolveCostSettings in app/lib/tools.ts):
  // deze drie vlaggen bepalen of de bovenstaande arbeidTariefUur/
  // voorrijTarief/btwPercentage daadwerkelijk gebruikt worden, of dat de
  // company-brede standaard geldt. Checkbox afwezig in de formData = uit
  // (eigen waarde), aanwezig ("on") = aan (accountinstelling volgen).
  const data = {
    ...parsed.data,
    gebruiktAccountArbeidTarief: formData.get("gebruiktAccountArbeidTarief") === "on",
    gebruiktAccountVoorrijTarief: formData.get("gebruiktAccountVoorrijTarief") === "on",
    gebruiktAccountBtw: formData.get("gebruiktAccountBtw") === "on",
  };

  await prisma.costSettings.upsert({
    where: { toolId },
    create: { toolId, ...data },
    update: data,
  });

  revalidatePath(`/dashboard/tools/${toolId}/prijzen`);
  revalidatePath("/dashboard");
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);

  return { success: true };
}
