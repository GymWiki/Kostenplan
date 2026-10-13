"use server";

import { prisma } from "@/app/lib/prisma";
import { recordAnalyticsEvent } from "@/app/lib/analytics-opslag";
import type { AnalyticsEventType } from "@/app/generated/prisma/client";

// Aangeroepen vanuit de publieke calculator (geen ingelogde gebruiker) voor
// VISIT/START/COMPLETE — LEAD wordt apart vastgelegd door createLeadAction
// zelf op het moment dat de aanvraag daadwerkelijk wordt aangemaakt. Zoekt
// companyId zelf op aan de hand van de (publieke) toolId, in plaats van dat
// te vertrouwen vanuit de client. Een niet-gepubliceerde/verwijderde tool
// registreert stilzwijgend niets — geen foutmelding nodig voor een
// achtergrond-telling.
export async function recordPublicAnalyticsEventAction(
  toolId: string,
  type: Extract<AnalyticsEventType, "VISIT" | "START" | "COMPLETE">
) {
  // Statistiek mag nooit iets stukmaken: is de database weg, dan telt dit
  // bezoek simpelweg niet mee.
  try {
    const tool = await prisma.tool.findFirst({
      where: { id: toolId, status: "GEPUBLICEERD", deletedAt: null },
      select: { companyId: true },
    });
    if (!tool) return;

    await recordAnalyticsEvent(tool.companyId, toolId, type);
  } catch (error) {
    console.error("Analytics-event overgeslagen:", error instanceof Error ? error.message : error);
  }
}
