import "server-only";
import { after } from "next/server";
import { prismaBasis } from "@/app/lib/prisma";
import { blobGeconfigureerd } from "./opslag";

// Modellen waarvan een schrijfactie de gepubliceerde rekentool kan veranderen.
export const SNAPSHOT_MODELLEN = new Set([
  "Tool",
  "Branding",
  "CostSettings",
  "Product",
  "MaterialCategory",
  "MaterialOption",
  "ExtraOption",
  "CalculatorConfig",
  "Company",
]);

export const SCHRIJF_OPERATIES = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

// Company-velden die in de snapshot terechtkomen (naam, tarieven, abonnement).
const COMPANY_VELDEN = new Set([
  "naam",
  "standaardArbeidTariefUur",
  "standaardVoorrijTarief",
  "standaardBtwPercentage",
  "subscriptionTier",
  "overrideTier",
]);

type Beschrijving = { model: string; where: Record<string, unknown> };

export function raaktSnapshot(model: string, operation: string, args: unknown): boolean {
  if (!SNAPSHOT_MODELLEN.has(model) || !SCHRIJF_OPERATIES.has(operation)) return false;
  if (model !== "Company") return true;
  const data = (args as { data?: unknown } | undefined)?.data;
  const lijst = Array.isArray(data) ? data : [data];
  return lijst.some((d) => d && typeof d === "object" && Object.keys(d).some((k) => COMPANY_VELDEN.has(k)));
}

// Zet een modelverwijzing om naar de tool-id's die erbij horen. Pure
// zoekactie op de (niet-uitgebreide) client, dus zonder zelf weer te plannen.
export async function toolIdsVoor({ model, where }: Beschrijving): Promise<string[]> {
  const b = prismaBasis;
  try {
    let ids: (string | undefined)[] = [];
    switch (model) {
      case "Tool":
        ids = (await b.tool.findMany({ where, select: { id: true } })).map((r) => r.id);
        break;
      case "Branding":
        ids = (await b.branding.findMany({ where, select: { toolId: true } })).map((r) => r.toolId);
        break;
      case "CostSettings":
        ids = (await b.costSettings.findMany({ where, select: { toolId: true } })).map((r) => r.toolId);
        break;
      case "Product":
        ids = (await b.product.findMany({ where, select: { toolId: true } })).map((r) => r.toolId);
        break;
      case "CalculatorConfig":
        ids = (await b.calculatorConfig.findMany({ where, select: { toolId: true } })).map((r) => r.toolId);
        break;
      case "MaterialCategory":
        ids = (await b.materialCategory.findMany({ where, select: { product: { select: { toolId: true } } } })).map(
          (r) => r.product.toolId
        );
        break;
      case "MaterialOption":
        ids = (
          await b.materialOption.findMany({
            where,
            select: { materialCategory: { select: { product: { select: { toolId: true } } } } },
          })
        ).map((r) => r.materialCategory.product.toolId);
        break;
      case "ExtraOption":
        ids = (await b.extraOption.findMany({ where, select: { product: { select: { toolId: true } } } })).map(
          (r) => r.product.toolId
        );
        break;
      case "Company":
        ids = (await b.tool.findMany({ where: { companyId: (where as { id?: string }).id, deletedAt: null }, select: { id: true } })).map(
          (r) => r.id
        );
        break;
    }
    return [...new Set(ids.filter((x): x is string => typeof x === "string"))];
  } catch {
    return [];
  }
}

async function markeerVuil(toolIds: string[]) {
  if (toolIds.length === 0) return;
  try {
    await prismaBasis.tool.updateMany({ where: { id: { in: toolIds } }, data: { snapshotVuil: true } });
  } catch {
    // database weg: er valt niets te publiceren
  }
}

const lopend = new Map<string, Promise<void>>();
const opnieuw = new Set<string>();

async function draaiPublicatie(toolId: string) {
  const { publiceerMetHerhaling } = await import("./publiceer");
  await publiceerMetHerhaling(toolId);
}

// Eén publicatie tegelijk per tool; komt er tijdens het publiceren nog een
// wijziging, dan volgt daarna precies één extra run.
function plannenVoorTool(toolId: string): Promise<void> {
  const bezig = lopend.get(toolId);
  if (bezig) {
    opnieuw.add(toolId);
    return bezig;
  }
  const taak = (async () => {
    try {
      // korte demping: meerdere schrijfacties van één opslag worden één publicatie
      await new Promise((r) => setTimeout(r, 400));
      do {
        opnieuw.delete(toolId);
        await draaiPublicatie(toolId);
      } while (opnieuw.has(toolId));
    } finally {
      lopend.delete(toolId);
    }
  })();
  lopend.set(toolId, taak);
  return taak;
}

// Plant publicatie ná het antwoord aan de hovenier (Next `after`), zodat
// opslaan nooit wacht op of faalt door het publiceren. Buiten een request
// (scripts) valt het terug op een gewone timer.
export function planPublicatie(toolIds: string[]): void {
  if (!blobGeconfigureerd() || toolIds.length === 0) return;
  const uniek = [...new Set(toolIds)];
  const werk = () => Promise.all(uniek.map(plannenVoorTool)).then(() => undefined);
  try {
    after(werk);
  } catch {
    void werk();
  }
}

// Haakt aan op een schrijfactie. `voorIds` zijn vooraf opgezocht (bij
// bewerken/verwijderen); `naBeschrijvingen` pas na afloop opgelost, omdat
// nieuwe rijen er voor het committen nog niet voor andere verbindingen zijn.
export async function verwerkSchrijfactie(voorIds: string[], naBeschrijving: Beschrijving | null): Promise<void> {
  if (!blobGeconfigureerd()) return;
  await markeerVuil(voorIds);
  planPublicatie(voorIds);
  if (naBeschrijving) {
    const werk = async () => {
      await new Promise((r) => setTimeout(r, 300));
      const ids = await toolIdsVoor(naBeschrijving);
      await markeerVuil(ids);
      await Promise.all(ids.map(plannenVoorTool));
    };
    try {
      after(werk);
    } catch {
      void werk();
    }
  }
}
