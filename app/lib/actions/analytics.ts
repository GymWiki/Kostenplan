"use server";

import { prisma } from "@/app/lib/prisma";
import { recordAnalyticsEvent } from "@/app/lib/analytics-opslag";
import type { AnalyticsEventType } from "@/app/generated/prisma/client";
import { PLAATSINGEN, WEERGAVEN } from "@/app/lib/weergave/config";

// De events die de publieke rekentool zelf meldt. LEAD legt de server vast bij het aanmaken van de aanvraag.
const PUBLIEKE_EVENTS = ["VISIT", "START", "COMPLETE", "ONDERDEEL_GEOPEND", "ONDERDEEL_TOEGEVOEGD", "OVERZICHT_BEKEKEN", "AANVRAAG_GESTART", "AANVRAAG_VERSTUURD", "POPUP_GEOPEND"] as const satisfies readonly AnalyticsEventType[];
export type PubliekEvent = (typeof PUBLIEKE_EVENTS)[number];

// Aangeroepen vanuit de publieke calculator (geen ingelogde gebruiker) voor
// VISIT/START/COMPLETE — LEAD wordt apart vastgelegd door createLeadAction
// zelf op het moment dat de aanvraag daadwerkelijk wordt aangemaakt. Zoekt
// companyId zelf op aan de hand van de (publieke) toolId, in plaats van dat
// te vertrouwen vanuit de client. Een niet-gepubliceerde/verwijderde tool
// registreert stilzwijgend niets — geen foutmelding nodig voor een
// achtergrond-telling.
export async function recordPublicAnalyticsEventAction(
  toolId: string,
  type: PubliekEvent,
  context: { weergave?: string; plaatsing?: string } = {}
) {
  // Van buitenaf aangeroepen: alleen bekende soorten en waarden, de rest valt stil weg.
  if (!(PUBLIEKE_EVENTS as readonly string[]).includes(type)) return;
  const weergave = (WEERGAVEN as readonly string[]).includes(context.weergave ?? "") ? context.weergave : undefined;
  const plaatsing = (PLAATSINGEN as readonly string[]).includes(context.plaatsing ?? "") ? context.plaatsing : undefined;
  // Statistiek mag nooit iets stukmaken: is de database weg, dan telt dit
  // bezoek simpelweg niet mee.
  try {
    const tool = await prisma.tool.findFirst({
      where: { id: toolId, status: "GEPUBLICEERD", deletedAt: null },
      select: { companyId: true },
    });
    if (!tool) return;

    await recordAnalyticsEvent(tool.companyId, toolId, type, { weergave, plaatsing });
  } catch (error) {
    console.error("Analytics-event overgeslagen:", error instanceof Error ? error.message : error);
  }
}
