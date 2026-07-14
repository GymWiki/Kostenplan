"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

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
