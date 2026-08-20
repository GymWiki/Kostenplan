"use server";

import { prisma } from "@/app/lib/prisma";
import type { AnalyticsEventType } from "@/app/generated/prisma/client";

// Interne helper — companyId is hier altijd al server-side vastgesteld
// (nooit een client-aangeleverde waarde), zie recordPublicAnalyticsEventAction
// hieronder en createLeadAction in actions/leads.ts. Fire-and-forget van
// aard: een mislukte analytics-write mag nooit de rest van een actie (een
// aanvraag versturen, de calculator tonen) blokkeren.
export async function recordAnalyticsEvent(companyId: string, toolId: string, type: AnalyticsEventType) {
  try {
    await prisma.analyticsEvent.create({ data: { companyId, toolId, type } });
  } catch (error) {
    console.error("Analytics-event opslaan mislukt:", error);
  }
}

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
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    select: { companyId: true },
  });
  if (!tool) return;

  await recordAnalyticsEvent(tool.companyId, toolId, type);
}
