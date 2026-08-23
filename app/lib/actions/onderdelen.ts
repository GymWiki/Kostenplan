"use server";

import { revalidatePath } from "next/cache";
import { requireDraftCalculatorConfig, requireOwnedOnderdeelBibliotheek } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { genereerId } from "@/app/dashboard/tools/[toolId]/bouwer/id-utils";
import type { CalculatorField, ModulaireCalculatorConfigData, OnderdeelConfig } from "@/app/lib/calculator-engine";
import type { Prisma } from "@/app/generated/prisma/client";

// ---------------------------------------------------------------------------
// Fase 4 — Onderdeel CRUD (Deel 6 van de opdracht: toevoegen/bewerken/
// verwijderen/dupliceren/herordenen/activeren). De meeste van die acties
// zijn pure JSON-array-mutaties op config.onderdelen (hernoemen, herordenen,
// activeren/deactiveren, verwijderen) en gaan daarom via de bestaande,
// ongewijzigde saveCalculatorConfigDraftAction (zie calculator-config.ts) —
// geen aparte server-actie nodig, precies zoals velden/regels binnen één
// Onderdeel dat ook al deden vóór Levering B v2.
//
// Dupliceren is de uitzondering: een naïeve client-side deep-copy van een
// Onderdeel met een PRODUCT_KEUZE-veld zou de kopie naar dezelfde
// MaterialCategory laten wijzen als het origineel — het bewerken van de
// kopie zou dan ongemerkt het origineel meewijzigen. Vandaar een server-
// round-trip die voor elk PRODUCT_KEUZE-veld verse carrier-rijen aanmaakt
// (copy-on-use, Deel 7/8 van de opdracht).
// ---------------------------------------------------------------------------

// Voor elk PRODUCT_KEUZE-veld: kloon de MaterialCategory + MaterialOption's
// naar een verse, verborgen carrier-Product, gescoped op `toolId`. Gebruikt
// door elk copy-on-use-pad (dupliceren, en vanuit de bibliotheek toevoegen).
//
// `companyId` scopet de bronlookup (Deel 13: "voorkom IDOR/cross-tenant
// toegang") — bij dupliceren binnen dezelfde tool is dit altijd al veilig
// (de bron-materialCategoryId komt uit de net ownership-gecontroleerde
// eigen CalculatorConfig van die tool), maar bij toevoegen vanuit de
// company-brede bibliotheek kan de bron een ANDERE tool van hetzelfde
// bedrijf zijn — vandaar hier defensief company-scoped i.p.v. tool-scoped,
// zelfde `findFirst`-met-relatie-in-de-where-idioom als
// upsertProductKeuzeOptiesAction in calculator-config.ts.
async function kloonProductKeuzeVelden(
  tx: Prisma.TransactionClient,
  toolId: string,
  companyId: string,
  velden: CalculatorField[]
): Promise<CalculatorField[]> {
  const gekloond: CalculatorField[] = [];
  for (const veld of velden) {
    if (veld.soort !== "PRODUCT_KEUZE") {
      gekloond.push(veld);
      continue;
    }
    const bron = await tx.materialCategory.findFirst({
      where: { id: veld.materialCategoryId, product: { tool: { companyId } } },
      include: { materialen: { orderBy: { order: "asc" } } },
    });
    const product = await tx.product.create({
      data: { toolId, naam: `${veld.label} (calculator-bouwer)`, actief: false, order: -1 },
    });
    const category = await tx.materialCategory.create({
      data: { productId: product.id, naam: bron?.naam ?? veld.label, order: 0 },
    });
    if (bron && bron.materialen.length > 0) {
      await tx.materialOption.createMany({
        data: bron.materialen.map((optie, i) => ({
          materialCategoryId: category.id,
          naam: optie.naam,
          prijs: optie.prijs,
          order: i,
        })),
      });
    }
    gekloond.push({ ...veld, materialCategoryId: category.id });
  }
  return gekloond;
}

export type DuplicateOnderdeelResult =
  | { success: true; onderdeel: OnderdeelConfig }
  | { success: false; error: string };

export async function duplicateOnderdeelAction(toolId: string, onderdeelId: string): Promise<DuplicateOnderdeelResult> {
  const { company, draft } = await requireDraftCalculatorConfig(toolId);
  const config = draft.config as unknown as ModulaireCalculatorConfigData;
  if (config.versie !== 2) {
    return { success: false, error: "Deze tool gebruikt het modulaire Onderdelensysteem niet." };
  }

  const bron = config.onderdelen.find((o) => o.id === onderdeelId);
  if (!bron) return { success: false, error: "Onderdeel niet gevonden." };

  const bestaandeIds = new Set(config.onderdelen.map((o) => o.id));
  const nieuweId = genereerId(`${bron.naam} kopie`, bestaandeIds);

  const nieuwOnderdeel = await prisma.$transaction(async (tx) => {
    const velden = await kloonProductKeuzeVelden(tx, toolId, company.id, bron.velden);
    const onderdeel: OnderdeelConfig = {
      ...bron,
      id: nieuweId,
      naam: `${bron.naam} (kopie)`,
      order: config.onderdelen.length,
      velden,
    };
    const nieuweConfig: ModulaireCalculatorConfigData = { ...config, onderdelen: [...config.onderdelen, onderdeel] };
    await tx.calculatorConfig.update({
      where: { id: draft.id },
      data: { config: nieuweConfig as unknown as Prisma.InputJsonValue },
    });
    return onderdeel;
  });

  revalidatePath(`/dashboard/tools/${toolId}/bouwer`);
  return { success: true, onderdeel: nieuwOnderdeel };
}

// ---------------------------------------------------------------------------
// Fase 12 — "Mijn onderdelen" (Deel 8 van de opdracht): een zelfgemaakt
// Onderdeel opslaan voor hergebruik in andere Tools, en vanuit die
// bibliotheek een verse, onafhankelijke kopie toevoegen aan een Tool
// (copy-on-use — wijzigen van het origineel raakt de bibliotheekrij nooit,
// en andersom).
// ---------------------------------------------------------------------------

export type SaveOnderdeelBibliotheekResult =
  | { success: true; item: import("@/app/generated/prisma/client").OnderdeelBibliotheek }
  | { success: false; error: string };

// Bewaart NIET opnieuw de PRODUCT_KEUZE-carrierrijen — de bibliotheekrij
// wordt zelf nooit door de prijsengine geëvalueerd, alleen gelezen als
// brondata bij hergebruik (addOnderdeelFromBibliotheekAction hieronder,
// die wél kloont). Zo blijft "opslaan als Mijn onderdeel" een goedkope
// metadata-actie i.p.v. een tweede volledige kopie te maken die meteen
// weer verweesd raakt.
export async function saveOnderdeelBibliotheekAction(
  toolId: string,
  onderdeelId: string,
  input: { naam: string; beschrijving?: string; icoon?: string }
): Promise<SaveOnderdeelBibliotheekResult> {
  const { company, draft } = await requireDraftCalculatorConfig(toolId);
  const config = draft.config as unknown as ModulaireCalculatorConfigData;
  if (config.versie !== 2) return { success: false, error: "Deze tool gebruikt het modulaire Onderdelensysteem niet." };

  const onderdeel = config.onderdelen.find((o) => o.id === onderdeelId);
  if (!onderdeel) return { success: false, error: "Onderdeel niet gevonden." };

  const naam = input.naam.trim();
  if (!naam) return { success: false, error: "Vul een naam in." };

  const item = await prisma.onderdeelBibliotheek.create({
    data: {
      companyId: company.id,
      naam,
      beschrijving: input.beschrijving?.trim() || null,
      icoon: input.icoon || null,
      config: {
        velden: onderdeel.velden,
        afgeleideVariabelen: onderdeel.afgeleideVariabelen,
        regels: onderdeel.regels,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { success: true, item };
}

export async function deleteOnderdeelBibliotheekAction(id: string): Promise<void> {
  const { item } = await requireOwnedOnderdeelBibliotheek(id);
  await prisma.onderdeelBibliotheek.delete({ where: { id: item.id } });
}

export type AddOnderdeelResult = { success: true; onderdeel: OnderdeelConfig } | { success: false; error: string };

export async function addOnderdeelFromBibliotheekAction(toolId: string, bibliotheekId: string): Promise<AddOnderdeelResult> {
  // Twee onafhankelijke eigenaarschapschecks (Deel 13 van de opdracht:
  // "voorkom IDOR/cross-tenant toegang") — dat de vakman de doel-Tool bezit
  // bewijst niets over de bron-bibliotheekrij, en omgekeerd. Allebei moeten
  // slagen vóórdat er iets wordt gelezen of geschreven.
  const { company, draft } = await requireDraftCalculatorConfig(toolId);
  const { item } = await requireOwnedOnderdeelBibliotheek(bibliotheekId);

  const config = draft.config as unknown as ModulaireCalculatorConfigData;
  if (config.versie !== 2) return { success: false, error: "Deze tool gebruikt het modulaire Onderdelensysteem niet." };

  const bron = item.config as unknown as { velden: CalculatorField[]; afgeleideVariabelen: OnderdeelConfig["afgeleideVariabelen"]; regels: OnderdeelConfig["regels"] };
  const bestaandeIds = new Set(config.onderdelen.map((o) => o.id));
  const nieuweId = genereerId(item.naam, bestaandeIds);

  const nieuwOnderdeel = await prisma.$transaction(async (tx) => {
    const velden = await kloonProductKeuzeVelden(tx, toolId, company.id, bron.velden ?? []);
    const onderdeel: OnderdeelConfig = {
      id: nieuweId,
      naam: item.naam,
      beschrijving: item.beschrijving ?? undefined,
      icoon: item.icoon ?? undefined,
      actief: true,
      order: config.onderdelen.length,
      velden,
      afgeleideVariabelen: bron.afgeleideVariabelen ?? [],
      regels: bron.regels ?? [],
    };
    const nieuweConfig: ModulaireCalculatorConfigData = { ...config, onderdelen: [...config.onderdelen, onderdeel] };
    await tx.calculatorConfig.update({
      where: { id: draft.id },
      data: { config: nieuweConfig as unknown as Prisma.InputJsonValue },
    });
    return onderdeel;
  });

  revalidatePath(`/dashboard/tools/${toolId}/bouwer`);
  return { success: true, onderdeel: nieuwOnderdeel };
}
