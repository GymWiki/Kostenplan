"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { onboardingBrandingSchema } from "@/app/lib/validation";
import { isOwnStorageUrl } from "@/app/lib/storage";
import { effectiveTier } from "@/app/lib/subscription";

// Er is geen databasespoor van een (publiek, anoniem) bezoek aan het eigen
// portaal, dus deze stap wordt expliciet vastgelegd zodra de gebruiker de
// link in de onboarding-checklist aanklikt (zie OnboardingChecklist).
export async function markPortaalBekekenAction() {
  const { company } = await requireActiveCompany();
  if (company.onboardingPortaalBekeken) return;

  await prisma.company.update({
    where: { id: company.id },
    data: { onboardingPortaalBekeken: true },
  });

  revalidatePath("/dashboard");
}

// Slaat het resultaat van de auto-branding-stap in /onboarding/huisstijl op
// — alleen de velden die de auto-detectie vond en de gebruiker aangevinkt
// liet staan (zie AutoBranding.handleApply), nooit het hele brandingSchema
// tegelijk. De rest van Branding (contactgegevens, bedanktekst, enz.) stelt
// de gebruiker later gewoon in op de gewone brandingpagina.
export async function applyOnboardingBrandingAction(formData: FormData) {
  const { company } = await requireActiveCompany();

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
    const veiligeLogoUrl = logoUrl && isOwnStorageUrl(logoUrl) ? logoUrl : undefined;
    // Kleuren/lettertype blijven een Plus/Pro-feature — alleen de extractie
    // zelf is gratis geworden. Een gloednieuw bedrijf staat hier altijd op
    // Gratis (subscriptionTier heeft geen ander startpunt), maar deze check
    // laat de logica kloppen mocht dat ooit veranderen, en spiegelt exact
    // updateBrandingAction hierboven in branding.ts.
    const magPersonaliserenUiterlijk = effectiveTier(company) !== "GRATIS";

    await prisma.branding.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
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

  redirect("/dashboard");
}
