import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteRegel } from "@/app/lib/offertes";
import { LeadsView, type LeadWithNotes } from "./leads-view";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const { company } = await requireActiveCompany();
  const isGratis = effectiveTier(company) === "GRATIS";

  // Leads ontvangen is een Plus/Pro-feature — op Gratis tonen we alleen de
  // upsell in LeadsView, dus de data zelf hoeft niet opgehaald te worden.
  if (isGratis) {
    return <LeadsView leads={[]} isGratis />;
  }

  const rawLeads = await prisma.lead.findMany({
    where: { companyId: company.id },
    include: { notities: { orderBy: { createdAt: "asc" } }, offerte: true },
    orderBy: { createdAt: "desc" },
  });

  const leads: LeadWithNotes[] = rawLeads.map((lead) => ({
    ...lead,
    snapshot: lead.snapshot as unknown as LeadSnapshot,
    offerte: lead.offerte
      ? { ...lead.offerte, regels: lead.offerte.regels as unknown as OfferteRegel[] }
      : null,
  }));

  // KPI's (pipelinewaarde, conversieratio, …) worden client-side in
  // LeadsView afgeleid van `leads` — zo bewegen ze meteen mee met een
  // optimistische statuswijziging in plaats van pas na de server-round-trip.
  return <LeadsView leads={leads} isGratis={false} />;
}
