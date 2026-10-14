import { prisma } from "@/app/lib/prisma";
import type { AnalyticsEventType } from "@/app/generated/prisma/client";

// Bewust GEEN "use server": dit mag niet als server action van buitenaf aanroepbaar zijn.
// Interne helper — companyId is hier altijd al server-side vastgesteld
// (nooit een client-aangeleverde waarde), zie recordPublicAnalyticsEventAction
// hieronder en createLeadAction in actions/leads.ts. Fire-and-forget van
// aard: een mislukte analytics-write mag nooit de rest van een actie (een
// aanvraag versturen, de calculator tonen) blokkeren.
export async function recordAnalyticsEvent(companyId: string, toolId: string, type: AnalyticsEventType, context: { weergave?: string; plaatsing?: string } = {}) {
  try {
    await prisma.analyticsEvent.create({ data: { companyId, toolId, type, weergave: context.weergave ?? null, plaatsing: context.plaatsing ?? null } });
  } catch (error) {
    console.error("Analytics-event opslaan mislukt:", error);
  }
}

