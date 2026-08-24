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

  const [rawLeads, tools] = await Promise.all([
    // Audit-bevinding T-04 (kritiek): deze query had geen enkele grens en
    // laadt bij groei naar duizenden aanvragen steeds meer data op elk
    // bezoek. `take: 500` is een veilige, direct werkzame ondergrens (ruim
    // boven wat één company vandaag heeft) zonder de client-architectuur
    // (optimistische statuswijziging, Kanban-bord, KPI-afleiding — die
    // allemaal op de volledige, al-geladen lijst leunen) te moeten
    // herbouwen. Echte cursor-paginering met server-side KPI-aggregatie is
    // vervolgwerk zodra een company dit plafond daadwerkelijk nadert.
    prisma.lead.findMany({
      where: { companyId: company.id },
      include: { notities: { orderBy: { createdAt: "asc" } }, offerte: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    // Voor het toolfilter hierboven de <LeadsView> — alleen niet-verwijderde
    // tools zijn te kiezen, een lead van een inmiddels verwijderde tool blijft
    // gewoon zichtbaar in "Alle rekentools" via toolNaamSnapshot.
    prisma.tool.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, naam: true },
    }),
  ]);

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
  return <LeadsView leads={leads} isGratis={false} tools={tools} />;
}
