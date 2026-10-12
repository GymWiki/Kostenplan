import { prisma } from "@/app/lib/prisma";
import { eersteRegelNaam } from "@/app/lib/lead-weergave";

export { eersteRegelNaam };

export type VandaagLead = { id: string; naam: string; werkzaamheid: string; bedrag: number; createdAt: Date };
export type VandaagOfferte = { leadId: string; naam: string; bedrag: number; verstuurdOp: Date | null };
export type ChecklistStap = { id: string; label: string; klaar: boolean; href: string };

export type VandaagData = {
  nieuweLeads: number;
  laatsteNieuweLeads: VandaagLead[];
  wachtendeOffertes: { aantal: number; lijst: VandaagOfferte[] };
  checklist: { toolId: string; toolNaam: string; stappen: ChecklistStap[] } | null;
  leadsDezeMaand: number;
  toolsLive: number;
  toolsTotaal: number;
};

export type Hoofdactie = { label: string; href: string } | null;

// Pure keuze van de ene hoofdknop: nieuwe aanvragen eerst, anders je
// rekentool afmaken, anders niets dringends (dan de leads).
export function kiesHoofdactie(d: Pick<VandaagData, "nieuweLeads" | "checklist" | "toolsTotaal">): Hoofdactie {
  if (d.toolsTotaal === 0) return { label: "Maak je eerste rekentool", href: "/dashboard/tools" };
  if (d.nieuweLeads > 0) return { label: "Bekijk nieuwe aanvragen", href: "/dashboard/leads?status=nieuw" };
  const open = d.checklist?.stappen.some((s) => !s.klaar);
  if (d.checklist && open) return { label: "Maak je rekentool af", href: `/dashboard/tools/${d.checklist.toolId}` };
  return { label: "Bekijk je aanvragen", href: "/dashboard/leads" };
}

// Alles voor het mobiele "Vandaag"-scherm.
export async function laadVandaag(companyId: string): Promise<VandaagData> {
  const beginVanMaand = new Date();
  beginVanMaand.setDate(1);
  beginVanMaand.setHours(0, 0, 0, 0);

  const [nieuw, nieuweLijst, offertes, leadsDezeMaand, tools] = await Promise.all([
    prisma.lead.count({ where: { companyId, status: "NIEUW" } }),
    prisma.lead.findMany({
      where: { companyId, status: "NIEUW" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, naam: true, snapshot: true, totaalIndicatie: true, createdAt: true },
    }),
    prisma.offerte.findMany({
      where: { status: "VERSTUURD", lead: { companyId } },
      orderBy: { verstuurdOp: "desc" },
      take: 20,
      select: { leadId: true, verstuurdOp: true, lead: { select: { naam: true, totaalIndicatie: true } } },
    }),
    prisma.lead.count({ where: { companyId, createdAt: { gte: beginVanMaand } } }),
    prisma.tool.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, naam: true, status: true },
    }),
  ]);

  // Checklist voor de eerste rekentool die nog niet af is (anders de eerste).
  let checklist: VandaagData["checklist"] = null;
  const kandidaten = tools.slice(0, 5);
  for (const t of kandidaten) {
    const [branding, producten, voorbeeld] = await Promise.all([
      prisma.branding.findUnique({ where: { toolId: t.id }, select: { logoUrl: true } }),
      prisma.product.count({ where: { toolId: t.id, actief: true } }),
      prisma.materialOption.count({ where: { isVoorbeeld: true, actief: true, materialCategory: { product: { toolId: t.id, actief: true } } } }),
    ]);
    const stappen: ChecklistStap[] = [
      { id: "logo", label: "Logo instellen", klaar: Boolean(branding?.logoUrl), href: `/dashboard/tools/${t.id}?paneel=uiterlijk` },
      { id: "werk", label: "Minstens één werkzaamheid", klaar: producten > 0, href: `/dashboard/tools/${t.id}?paneel=toevoegen` },
      { id: "prijzen", label: "Voorbeeldprijzen vervangen", klaar: producten > 0 && voorbeeld === 0, href: `/dashboard/tools/${t.id}` },
      { id: "website", label: "Op je website gezet", klaar: t.status === "GEPUBLICEERD", href: `/dashboard/tools/${t.id}?paneel=website` },
    ];
    if (!checklist || (checklist.stappen.every((s) => s.klaar) && !stappen.every((s) => s.klaar))) {
      checklist = { toolId: t.id, toolNaam: t.naam, stappen };
    }
    if (checklist && !checklist.stappen.every((s) => s.klaar)) break;
  }
  if (checklist && checklist.stappen.every((s) => s.klaar)) checklist = null;

  return {
    nieuweLeads: nieuw,
    laatsteNieuweLeads: nieuweLijst.map((l) => ({
      id: l.id,
      naam: l.naam,
      werkzaamheid: eersteRegelNaam(l.snapshot),
      bedrag: l.totaalIndicatie,
      createdAt: l.createdAt,
    })),
    wachtendeOffertes: {
      aantal: offertes.length,
      lijst: offertes.slice(0, 3).map((o) => ({ leadId: o.leadId, naam: o.lead.naam, bedrag: o.lead.totaalIndicatie, verstuurdOp: o.verstuurdOp })),
    },
    checklist,
    leadsDezeMaand,
    toolsLive: tools.filter((t) => t.status === "GEPUBLICEERD").length,
    toolsTotaal: tools.length,
  };
}
