import { prisma } from "@/app/lib/prisma";
import { herinneringNodig } from "./status";

// Meldingen voor de hovenier in Overzicht en Leads: reacties van klanten die hij nog niet heeft gezien,
// en offertes die een herinnering verdienen. Alles wordt bij het openen van de pagina berekend;
// er is geen achtergrondtaak en er gaat niets automatisch de deur uit.
export type OfferteTipSoort = "bekeken" | "akkoord" | "vraag" | "afgewezen" | "verloopt-binnenkort" | "geen-reactie";

export type OfferteTip = {
  offerteId: string;
  leadId: string;
  naam: string;
  nummer: string;
  soort: OfferteTipSoort;
};

export const OFFERTE_TIP_TEKST: Record<OfferteTipSoort, string> = {
  bekeken: "heeft de offerte bekeken",
  akkoord: "is akkoord gegaan met de offerte",
  vraag: "heeft een vraag over de offerte",
  afgewezen: "heeft de offerte afgewezen",
  "verloopt-binnenkort": "De offerte verloopt binnenkort",
  "geen-reactie": "Nog geen reactie op de offerte",
};

export const isHerinneringTip = (s: OfferteTipSoort) => s === "verloopt-binnenkort" || s === "geen-reactie";

export async function laadOfferteTips(companyId: string): Promise<OfferteTip[]> {
  const [ongezien, open] = await Promise.all([
    prisma.offerteV2.findMany({
      where: { companyId, reactieGezien: false, leadId: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        leadId: true,
        nummer: true,
        lead: { select: { naam: true } },
        gebeurtenissen: { orderBy: { createdAt: "desc" }, take: 1, select: { soort: true } },
      },
    }),
    prisma.offerteV2.findMany({
      where: { companyId, status: { in: ["VERSTUURD", "BEKEKEN"] }, leadId: { not: null }, reactieGezien: true },
      take: 100,
      select: { id: true, leadId: true, nummer: true, status: true, geldigTot: true, verstuurdOp: true, lead: { select: { naam: true } } },
    }),
  ]);

  const tips: OfferteTip[] = [];
  for (const o of ongezien) {
    const soort = o.gebeurtenissen[0]?.soort;
    if (!o.leadId || !o.lead || !soort) continue;
    const kaart: Partial<Record<string, OfferteTipSoort>> = { BEKEKEN: "bekeken", AKKOORD: "akkoord", VRAAG: "vraag", AFGEWEZEN: "afgewezen" };
    const tipSoort = kaart[soort];
    if (tipSoort) tips.push({ offerteId: o.id, leadId: o.leadId, naam: o.lead.naam, nummer: o.nummer, soort: tipSoort });
  }
  for (const o of open) {
    if (!o.leadId || !o.lead) continue;
    const reden = herinneringNodig({ status: o.status, geldigTot: o.geldigTot, verstuurdOp: o.verstuurdOp });
    if (reden) tips.push({ offerteId: o.id, leadId: o.leadId, naam: o.lead.naam, nummer: o.nummer, soort: reden });
  }
  return tips;
}

export async function telOngezienReacties(companyId: string): Promise<number> {
  return prisma.offerteV2.count({ where: { companyId, reactieGezien: false } });
}
