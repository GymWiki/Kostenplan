import "server-only";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { parseGetal } from "@/app/lib/sjablonen";
import type { ArbeidStapEenheid } from "@/app/generated/prisma/client";

// Gedeelde kern van de eenmalige "basistarieven"-vraag (wizard stap 3 en
// onboarding): bewust géén "use server"-bestand, zodat dit niet als
// aanroepbare server action wordt blootgesteld — de actions die dit
// aanroepen doen eerst zelf de autorisatie (requireActiveTool).
export type BasisTarieven = {
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTariefUur: number;
  arbeidTariefDagdeel: number;
  arbeidTariefDag: number;
  voorrijTarief: number;
  transportTarief: number;
};

const schema = z.object({
  arbeidStapEenheid: z.enum(["UUR", "DAGDEEL", "DAG"]),
  arbeidTarief: z.number().min(0),
  voorrijTarief: z.number().min(0),
  transportTarief: z.number().min(0),
});

export function parseBasisTarievenForm(formData: FormData) {
  return schema.safeParse({
    arbeidStapEenheid: formData.get("arbeidStapEenheid"),
    arbeidTarief: parseGetal(formData.get("arbeidTarief"), NaN),
    voorrijTarief: parseGetal(formData.get("voorrijTarief"), NaN),
    transportTarief: parseGetal(formData.get("transportTarief"), NaN),
  });
}

export async function slaBasisTarievenOp(
  companyId: string,
  toolId: string,
  invoer: z.infer<typeof schema>
): Promise<{ error: string } | { opgeslagen: BasisTarieven }> {
  const { arbeidStapEenheid, arbeidTarief, voorrijTarief, transportTarief } = invoer;

  const huidig = await prisma.costSettings.findUnique({ where: { toolId } });
  const huidigeEenheid = huidig?.arbeidStapEenheid ?? "UUR";
  if (arbeidStapEenheid !== huidigeEenheid) {
    const metProductiviteit = await prisma.product.count({
      where: { toolId, productiviteit: { not: null } },
    });
    if (metProductiviteit > 0) {
      return {
        error: `Je bestaande onderdelen rekenen al per ${huidigeEenheid.toLowerCase()}. Wijzig dat via Prijzen, dan pas je daar ook de productiviteit aan.`,
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
    prisma.costSettings.upsert({ where: { toolId }, create: { toolId, ...data }, update: data }),
    prisma.company.update({
      where: { id: companyId },
      data: {
        standaardVoorrijTarief: voorrijTarief,
        ...(arbeidStapEenheid === "UUR" ? { standaardArbeidTariefUur: arbeidTarief } : {}),
      },
    }),
  ]);

  return { opgeslagen: { ...data } };
}
