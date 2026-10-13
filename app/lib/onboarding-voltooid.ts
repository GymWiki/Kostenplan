import { prisma } from "@/app/lib/prisma";

// Bewust GEEN "use server": een server action met een client-companyId zou van buitenaf aanroepbaar zijn.
// Gezet zodra alle onboarding-stappen voltooid zijn (zie bouwOnboardingStappen
// in app/lib/onboarding.ts) — rechtstreeks aangeroepen vanuit dashboard/
// page.tsx tijdens render, niet gebonden aan een formulier. Verplaatst
// hierheen vanuit de page zelf (Fase 2, P2.9): een write hoort niet
// rechtstreeks in een Server Component te staan.
export async function markOnboardingVoltooid(companyId: string) {
  await prisma.company.update({ where: { id: companyId }, data: { onboardingVoltooid: true } });
}
