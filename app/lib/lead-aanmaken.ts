import "server-only";
import { prisma } from "@/app/lib/prisma";
import { recordAnalyticsEvent } from "@/app/lib/actions/analytics";
import { leadContactSchema, leadSnapshotSchema } from "@/app/lib/validation";
import { effectiveTier } from "@/app/lib/subscription";

export type LeadInvoer = {
  toolId: string;
  naam: unknown;
  email: unknown;
  telefoonnummer?: unknown;
  snapshot: unknown;
  // Door de browser gemaakt per aanvraag; dezelfde sleutel = dezelfde lead.
  sleutel?: unknown;
};

export type LeadUitslag =
  | { ok: true; leadId: string; dubbel: boolean }
  | { ok: false; permanent: true; error?: string; fieldErrors?: Record<string, string> };

const SLEUTEL_PATROON = /^[A-Za-z0-9_-]{16,64}$/;
const ONGELDIG = "Ongeldige aanvraag. Ververs de pagina en probeer het opnieuw.";

// Gedeelde kern voor "een lead opslaan" — gebruikt door de server action van
// de rekentool, de herhaal-route (/api/embed/lead) en het opnemen van leads
// uit de Cloudflare-reserve. Gooit bij een tijdelijke fout (database weg):
// de aanroeper antwoordt dan "probeer later opnieuw" en niets gaat verloren.
// Een uitslag met `permanent: true` is definitief (ongeldige invoer, tool weg).
export async function maakLead(invoer: LeadInvoer): Promise<LeadUitslag> {
  const contact = leadContactSchema.safeParse({
    naam: invoer.naam,
    email: invoer.email,
    telefoonnummer: invoer.telefoonnummer ?? "",
  });
  if (!contact.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of contact.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, permanent: true, fieldErrors };
  }
  const snapshot = leadSnapshotSchema.safeParse(invoer.snapshot);
  if (!snapshot.success) return { ok: false, permanent: true, error: ONGELDIG };

  const sleutel = typeof invoer.sleutel === "string" && SLEUTEL_PATROON.test(invoer.sleutel) ? invoer.sleutel : null;
  if (invoer.sleutel != null && invoer.sleutel !== "" && !sleutel) return { ok: false, permanent: true, error: ONGELDIG };

  if (sleutel) {
    const bestaand = await prisma.lead.findUnique({ where: { idempotentieSleutel: sleutel }, select: { id: true } });
    if (bestaand) return { ok: true, leadId: bestaand.id, dubbel: true };
  }

  const tool = await prisma.tool.findFirst({
    where: { id: invoer.toolId, deletedAt: null, status: "GEPUBLICEERD" },
    select: {
      id: true,
      naam: true,
      companyId: true,
      activeCalculatorConfigId: true,
      company: { select: { subscriptionTier: true, overrideTier: true } },
    },
  });
  if (!tool) return { ok: false, permanent: true, error: "Deze rekentool is niet (meer) beschikbaar." };

  // Zelfde poort als de "Offerte aanvragen"-knop zelf (Plus/Pro-only) — een
  // rechtstreeks verzoek kan de client-side gate omzeilen, dus hier nogmaals.
  if (effectiveTier(tool.company) === "GRATIS") {
    return { ok: false, permanent: true, error: "Offertes aanvragen is niet beschikbaar voor dit bedrijf." };
  }

  let leadId: string;
  try {
    const lead = await prisma.lead.create({
      data: {
        companyId: tool.companyId,
        toolId: tool.id,
        toolNaamSnapshot: tool.naam,
        // Pint vast welke CalculatorConfig-versie live stond (server-side afgeleid,
        // nooit van client-invoer); samen met het bevroren snapshot garandeert dit
        // dat een offerte nooit verandert als de vakman zijn rekentool later aanpast.
        calculatorConfigId: tool.activeCalculatorConfigId,
        naam: contact.data.naam,
        email: contact.data.email,
        telefoonnummer: contact.data.telefoonnummer || null,
        snapshot: snapshot.data,
        totaalIndicatie: snapshot.data.totaal,
        idempotentieSleutel: sleutel,
      },
      select: { id: true },
    });
    leadId = lead.id;
  } catch (e) {
    // Tweede gelijktijdige verzoek met dezelfde sleutel: de unieke index wint.
    if (sleutel && typeof e === "object" && e && (e as { code?: string }).code === "P2002") {
      const bestaand = await prisma.lead.findUnique({ where: { idempotentieSleutel: sleutel }, select: { id: true } });
      if (bestaand) return { ok: true, leadId: bestaand.id, dubbel: true };
    }
    throw e;
  }

  await recordAnalyticsEvent(tool.companyId, tool.id, "LEAD");
  return { ok: true, leadId, dubbel: false };
}
