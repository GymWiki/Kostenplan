import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { telItMeeVoorPipeline, type LeadSnapshot } from "@/app/lib/leads";
import { LeadsView, type LeadWithNotes } from "./leads-view";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const user = await requireUser();

  const rawLeads = await prisma.lead.findMany({
    where: { userId: user.id },
    include: { notities: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const leads: LeadWithNotes[] = rawLeads.map((lead) => ({
    ...lead,
    snapshot: lead.snapshot as unknown as LeadSnapshot,
  }));

  const actief = leads.filter((lead) => telItMeeVoorPipeline(lead.status));
  const pipelineWaarde = actief.reduce((sum, lead) => sum + lead.totaalIndicatie, 0);
  const gewonnenCount = leads.filter((lead) => lead.status === "GEWONNEN").length;
  const verlorenCount = leads.filter((lead) => lead.status === "VERLOREN").length;
  const afgerondCount = gewonnenCount + verlorenCount;
  const conversieRatio = afgerondCount > 0 ? Math.round((gewonnenCount / afgerondCount) * 100) : null;

  return (
    <LeadsView
      leads={leads}
      pipelineWaarde={pipelineWaarde}
      actieveCount={actief.length}
      gewonnenCount={gewonnenCount}
      conversieRatio={conversieRatio}
      isGratis={effectiveTier(user) === "GRATIS"}
    />
  );
}
