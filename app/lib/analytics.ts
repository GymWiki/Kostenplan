import { prisma } from "@/app/lib/prisma";
import type { AnalyticsEventType } from "@/app/generated/prisma/client";

export type AnalyticsSummary = {
  bezoeken: number;
  gestart: number;
  voltooid: number;
  aanvragen: number;
  // null zolang er nog geen bezoek is geweest — "0%" zou anders suggereren
  // dat er wél verkeer was dat allemaal afhaakte.
  conversieRatio: number | null;
};

function samenvatting(counts: { type: AnalyticsEventType; _count: { _all: number } }[]): AnalyticsSummary {
  const bij = (type: AnalyticsEventType) => counts.find((c) => c.type === type)?._count._all ?? 0;
  const bezoeken = bij("VISIT");
  const aanvragen = bij("LEAD");
  return {
    bezoeken,
    gestart: bij("START"),
    voltooid: bij("COMPLETE"),
    aanvragen,
    conversieRatio: bezoeken > 0 ? Math.round((aanvragen / bezoeken) * 100) : null,
  };
}

// Eén tool — voor de "Overzicht"-pagina van die tool.
export async function getToolAnalyticsSummary(toolId: string): Promise<AnalyticsSummary> {
  const counts = await prisma.analyticsEvent.groupBy({
    by: ["type"],
    where: { toolId },
    _count: { _all: true },
  });
  return samenvatting(counts);
}

// Alle tools van een bedrijf samen — voor de "Alle rekentools"-weergave.
export async function getCompanyAnalyticsSummary(companyId: string): Promise<AnalyticsSummary> {
  const counts = await prisma.analyticsEvent.groupBy({
    by: ["type"],
    where: { companyId },
    _count: { _all: true },
  });
  return samenvatting(counts);
}
