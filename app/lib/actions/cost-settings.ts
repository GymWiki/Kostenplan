"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { costSettingsSchema } from "@/app/lib/validation";
import { z } from "zod";
import { parseGetal } from "@/app/lib/sjablonen";

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

// Wizard stap 3: de eenmalige "basistarieven"-vraag. Slaat op als algemene
// instelling — voor uurtarief en voorrijkosten is dat de bedrijfsbrede
// default (Company.standaard*), voor de rest bestaat alleen een
// tool-instelling. Alles gaat ook in CostSettings van deze tool, zodat de
// tool direct rekent met wat de hovenier hier invult.
export type BasisTarievenState =
  | {
      error?: string;
      opgeslagen?: {
        arbeidStapEenheid: "UUR" | "DAGDEEL" | "DAG";
        arbeidTariefUur: number;
        arbeidTariefDagdeel: number;
        arbeidTariefDag: number;
        voorrijTarief: number;
        transportTarief: number;
      };
    }
  | null;

const basisTarievenSchema = z.object({
  arbeidStapEenheid: z.enum(["UUR", "DAGDEEL", "DAG"]),
  arbeidTarief: z.number().min(0, "Tarief kan niet negatief zijn"),
  voorrijTarief: z.number().min(0, "Bedrag kan niet negatief zijn"),
  transportTarief: z.number().min(0, "Bedrag kan niet negatief zijn"),
});

export async function saveBasisTarievenAction(
  toolId: string,
  _prevState: BasisTarievenState,
  formData: FormData
): Promise<BasisTarievenState> {
  const { company, tool } = await requireActiveTool(toolId);

  const parsed = basisTarievenSchema.safeParse({
    arbeidStapEenheid: formData.get("arbeidStapEenheid"),
    arbeidTarief: parseGetal(formData.get("arbeidTarief"), NaN),
    voorrijTarief: parseGetal(formData.get("voorrijTarief"), NaN),
    transportTarief: parseGetal(formData.get("transportTarief"), NaN),
  });
  if (!parsed.success) {
    return { error: "Controleer de ingevulde bedragen en probeer het opnieuw." };
  }
  const { arbeidStapEenheid, arbeidTarief, voorrijTarief, transportTarief } = parsed.data;

  const huidig = await prisma.costSettings.findUnique({ where: { toolId } });
  const huidigeEenheid = huidig?.arbeidStapEenheid ?? "UUR";
  if (arbeidStapEenheid !== huidigeEenheid) {
    const metProductiviteit = await prisma.product.count({
      where: { toolId, productiviteit: { not: null } },
    });
    if (metProductiviteit > 0) {
      return {
        error: `Je bestaande werkzaamheden rekenen al per ${huidigeEenheid.toLowerCase()}. Wijzig dat via Prijzen, dan pas je daar ook de productiviteit aan.`,
      };
    }
  }

  const tarieven = {
    arbeidTariefUur: arbeidStapEenheid === "UUR" ? arbeidTarief : huidig?.arbeidTariefUur ?? 45,
    arbeidTariefDagdeel: arbeidStapEenheid === "DAGDEEL" ? arbeidTarief : huidig?.arbeidTariefDagdeel ?? 180,
    arbeidTariefDag: arbeidStapEenheid === "DAG" ? arbeidTarief : huidig?.arbeidTariefDag ?? 360,
  };
  const data = { arbeidStapEenheid, ...tarieven, voorrijTarief, transportTarief };

  await prisma.$transaction([
    prisma.costSettings.upsert({
      where: { toolId },
      create: { toolId, ...data },
      update: data,
    }),
    prisma.company.update({
      where: { id: company.id },
      data: {
        standaardVoorrijTarief: voorrijTarief,
        ...(arbeidStapEenheid === "UUR" ? { standaardArbeidTariefUur: arbeidTarief } : {}),
      },
    }),
  ]);

  revalidatePath(`/dashboard/tools/${toolId}/prijzen`);
  revalidatePath(`/t/${company.slug}/${tool.slug}`);
  revalidatePath(`/portaal/${company.slug}`);

  return { opgeslagen: { arbeidStapEenheid, ...tarieven, voorrijTarief, transportTarief } };
}
