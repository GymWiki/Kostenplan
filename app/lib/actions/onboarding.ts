"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

// Er is geen databasespoor van een (publiek, anoniem) bezoek aan het eigen
// portaal, dus deze stap wordt expliciet vastgelegd zodra de gebruiker de
// link in de onboarding-checklist aanklikt (zie OnboardingChecklist).
export async function markPortaalBekekenAction() {
  const user = await requireUser();
  if (user.onboardingPortaalBekeken) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingPortaalBekeken: true },
  });

  revalidatePath("/dashboard");
}
