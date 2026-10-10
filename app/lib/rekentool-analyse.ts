import { prisma } from "@/app/lib/prisma";
import { parseCalculatorConfig } from "@/app/lib/calculator-engine";
import { arbeidTariefVoorStapEenheid } from "@/app/lib/calculate";
import { classificeerOnderdeel, type Classificatie } from "@/app/lib/werkzaamheid-classificeer";
import type { EngineTarieven } from "@/app/lib/werkzaamheid-engine";
import type { CostSettings } from "@/app/generated/prisma/client";

// Leest (alleen) een rekentool die op maat is gebouwd en beoordeelt per
// onderdeel of die in de standaardblokken van een werkzaamheid past. Wordt
// gebruikt door de editor ("Aangepast" + "Omzetten naar standaardblokken")
// en door scripts/audit-onderdelen.ts. Schrijft nooit iets.
export type OnderdeelAnalyse = {
  onderdeelId: string;
  naam: string;
  // Het werkzaamheid-record (Product) dat de materialen van dit onderdeel bewaart.
  productId: string | null;
  classificatie: Classificatie;
};

export type RekentoolAnalyse =
  | { soort: "GEEN_OP_MAAT" }
  | { soort: "NIET_OMZETBAAR"; reden: string }
  | { soort: "ANALYSE"; onderdelen: OnderdeelAnalyse[] };

type TariefInstellingen = Pick<
  CostSettings,
  | "materiaalEnabled" | "arbeidEnabled" | "arbeidStapEenheid" | "arbeidTariefUur" | "arbeidTariefDagdeel" | "arbeidTariefDag"
  | "voorrijEnabled" | "voorrijTarief" | "transportEnabled" | "transportTarief"
>;

export function engineTarievenVan(cs: TariefInstellingen): EngineTarieven {
  return {
    materiaalEnabled: cs.materiaalEnabled,
    arbeidEnabled: cs.arbeidEnabled,
    arbeidTarief: arbeidTariefVoorStapEenheid(cs, cs.arbeidStapEenheid),
    voorrijEnabled: cs.voorrijEnabled,
    voorrijTarief: cs.voorrijTarief,
    transportEnabled: cs.transportEnabled,
    transportTarief: cs.transportTarief,
  };
}

export async function analyseerRekentool(toolId: string, costSettings: TariefInstellingen): Promise<RekentoolAnalyse> {
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { activeCalculatorConfig: { select: { config: true } } },
  });
  if (!tool?.activeCalculatorConfig) return { soort: "GEEN_OP_MAAT" };

  const config = parseCalculatorConfig(tool.activeCalculatorConfig.config);
  if (config.versie !== 2) {
    return { soort: "NIET_OMZETBAAR", reden: "Deze rekentool is nog in de oudere opzet gebouwd. Die kan niet automatisch worden omgezet." };
  }

  const tarieven = engineTarievenVan(costSettings);
  const onderdelen: OnderdeelAnalyse[] = [];
  for (const o of config.onderdelen.filter((x) => x.actief)) {
    const keuze = o.velden.find((v) => v.soort === "PRODUCT_KEUZE");
    const categorie =
      keuze && keuze.soort === "PRODUCT_KEUZE"
        ? await prisma.materialCategory.findFirst({
            where: { id: keuze.materialCategoryId, product: { toolId } },
            include: { materialen: { where: { actief: true }, orderBy: { order: "asc" } } },
          })
        : null;
    const materialen = (categorie?.materialen ?? []).map((m) => ({ id: m.id, naam: m.naam, prijs: m.prijs }));
    onderdelen.push({
      onderdeelId: o.id,
      naam: o.naam,
      productId: categorie?.productId ?? null,
      classificatie: classificeerOnderdeel(o, materialen, tarieven),
    });
  }
  return { soort: "ANALYSE", onderdelen };
}
