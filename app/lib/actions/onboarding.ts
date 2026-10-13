"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { onboardingBrandingSchema, onboardingToolSchema } from "@/app/lib/validation";
import { generateUniqueToolSlug } from "@/app/lib/slug";
import type { Prisma } from "@/app/generated/prisma/client";
import { isOwnStorageUrl } from "@/app/lib/storage";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { parseBasisTarievenForm, slaBasisTarievenOp } from "@/app/lib/basis-tarieven-server";
import { standaardConfigVoorSjabloon } from "@/app/lib/sjablonen";
import { HOVENIER_PRESETS, REKENMETHODE_SJABLOON, productiviteitVoorStapEenheid, verdeelOverRuimte } from "@/app/lib/presets";

export type OnboardingToolFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

// /onboarding/rekentool — de eerste rekentool van een net aangemaakt bedrijf
// (zie createCompanyAction in companies.ts). Geen templatekeuze hier (dat is
// Levering B) — gewoon een naam, CostSettings die de company-defaults volgt
// (net als elke nieuwe tool, zie Deel 4 van de opdracht), en meteen door
// naar de huisstijl-stap.
export async function createFirstToolAction(
  _prevState: OnboardingToolFormState,
  formData: FormData
): Promise<OnboardingToolFormState> {
  const { company } = await requireActiveCompany();

  const parsed = onboardingToolSchema.safeParse({ naam: formData.get("naam") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const slug = await generateUniqueToolSlug(company.id, parsed.data.naam);

  await prisma.tool.create({
    data: {
      companyId: company.id,
      naam: parsed.data.naam,
      slug,
      costSettings: { create: {} },
    },
  });

  redirect("/onboarding/huisstijl");
}

// Slaat het resultaat van de auto-branding-stap in /onboarding/huisstijl op
// — alleen de velden die de auto-detectie vond en de gebruiker aangevinkt
// liet staan (zie AutoBranding.handleApply), nooit het hele brandingSchema
// tegelijk. De rest van Branding (contactgegevens, bedanktekst, enz.) stelt
// de gebruiker later gewoon in op de gewone uiterlijk-pagina van de tool.
export async function applyOnboardingBrandingAction(formData: FormData) {
  const { company } = await requireActiveCompany();

  // De tool die net in /onboarding/rekentool is aangemaakt — er bestaat op
  // dit punt in de flow altijd precies één tool voor dit bedrijf, dus de
  // meest recente pakken is voldoende zonder een toolId door de flow heen
  // te hoeven dragen.
  const tool = await prisma.tool.findFirst({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!tool) redirect("/onboarding/rekentool");

  const parsed = onboardingBrandingSchema.safeParse({
    primaireKleur: formData.get("primaireKleur") ?? "",
    lettertype: formData.get("lettertype") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
    customTitel: formData.get("customTitel") ?? "",
    welkomstTekst: formData.get("welkomstTekst") ?? "",
  });

  if (parsed.success) {
    const { primaireKleur, lettertype, logoUrl, customTitel, welkomstTekst } = parsed.data;
    // logoUrl komt uit een hidden field dat wijzelf renderen op basis van de
    // extractie-response, maar die is al eerder client-naar-server gegaan —
    // nooit blind vertrouwen dat het echt uit onze eigen Storage komt, zelfde
    // check als bij een normale branding-update (zie resolveLogo hierboven
    // in branding.ts).
    const veiligeLogoUrl = logoUrl && isOwnStorageUrl(logoUrl, company.id) ? logoUrl : undefined;
    // Kleuren/lettertype blijven een Plus/Pro-feature — alleen de extractie
    // zelf is gratis geworden. Een gloednieuw bedrijf staat hier altijd op
    // Gratis (subscriptionTier heeft geen ander startpunt), maar deze check
    // laat de logica kloppen mocht dat ooit veranderen, en spiegelt exact
    // updateBrandingAction hierboven in branding.ts.
    const magPersonaliserenUiterlijk = effectiveTier(company) !== "GRATIS";

    await prisma.branding.upsert({
      where: { toolId: tool.id },
      create: {
        toolId: tool.id,
        ...(magPersonaliserenUiterlijk && primaireKleur ? { primaireKleur } : {}),
        ...(magPersonaliserenUiterlijk && lettertype ? { lettertype } : {}),
        ...(veiligeLogoUrl ? { logoUrl: veiligeLogoUrl } : {}),
        ...(customTitel ? { customTitel } : {}),
        ...(welkomstTekst ? { welkomstTekst } : {}),
      },
      update: {
        ...(magPersonaliserenUiterlijk && primaireKleur ? { primaireKleur } : {}),
        ...(magPersonaliserenUiterlijk && lettertype ? { lettertype } : {}),
        ...(veiligeLogoUrl ? { logoUrl: veiligeLogoUrl } : {}),
        ...(customTitel ? { customTitel } : {}),
        ...(welkomstTekst ? { welkomstTekst } : {}),
      },
    });
  }

  revalidatePath(`/dashboard/tools/${tool.id}`);
  redirect("/onboarding/onderdelen");
}

export type StartpakketFormState = { error?: string } | null;

// /onboarding/werkzaamheden: de gekozen hovenier-presets worden in één keer
// als werkzaamheden (Product) aangemaakt, met de standaardwaarden uit de
// preset, samen met de eenmalige basistarieven. Past het aantal niet binnen
// de productlimiet van het abonnement, dan worden de eerste N aangemaakt en
// geeft de volgende pagina de rest terug als upgrade-suggestie (?over=).
export async function createStartpakketAction(
  _prevState: StartpakketFormState,
  formData: FormData
): Promise<StartpakketFormState> {
  const { company } = await requireActiveCompany();

  const tool = await prisma.tool.findFirst({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!tool) redirect("/onboarding/rekentool");

  // Dubbel versturen of terugknop: er staat al een startpakket, niets
  // nogmaals aanmaken.
  if ((await prisma.product.count({ where: { toolId: tool.id } })) > 0) redirect("/onboarding/klaar");

  const gekozen = new Set(formData.getAll("preset").map(String));
  const presets = HOVENIER_PRESETS.filter((p) => gekozen.has(p.id));
  if (presets.length === 0) return { error: "Kies minstens één onderdeel." };

  const tarieven = parseBasisTarievenForm(formData);
  if (!tarieven.success) return { error: "Controleer je tarieven en probeer het opnieuw." };
  const opgeslagen = await slaBasisTarievenOp(company.id, tool.id, tarieven.data);
  if ("error" in opgeslagen) return { error: opgeslagen.error };
  const stapEenheid = tarieven.data.arbeidStapEenheid;

  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  const bestaand = await prisma.product.count({ where: { tool: { companyId: company.id } } });
  const { aanmaken, over } = verdeelOverRuimte(presets, limiet === null ? null : limiet - bestaand);

  await prisma.$transaction(
    aanmaken.map((preset, i) => {
      const sjabloon = REKENMETHODE_SJABLOON[preset.rekenmethode];
      return prisma.product.create({
        data: {
          toolId: tool.id,
          naam: preset.naam,
          omschrijving: preset.uitleg,
          eenheid: preset.eenheid,
          sjabloon,
          sjabloonConfig: standaardConfigVoorSjabloon(sjabloon) as Prisma.InputJsonValue,
          productiviteit: productiviteitVoorStapEenheid(preset, stapEenheid),
          icoon: preset.icoon,
          actief: true,
          order: i,
          materiaalCategorieen: {
            create: [
              {
                naam: "Materiaal",
                verplicht: true,
                order: 0,
                materialen: { create: preset.materialen.map((m, j) => ({ naam: m.naam, prijs: m.prijs, order: j, isVoorbeeld: true })) },
              },
            ],
          },
        },
      });
    })
  );

  revalidatePath(`/dashboard/tools/${tool.id}`);
  revalidatePath(`/dashboard/tools/${tool.id}/producten`);
  redirect(over.length > 0 ? `/onboarding/klaar?over=${over.map((p) => p.id).join(",")}` : "/onboarding/klaar");
}
