"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma, prismaBasis } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { ontbrekendeVerplichteGegevens } from "@/app/lib/offerte/gegevens";
import { bouwInhoudUitLead } from "@/app/lib/offerte/nieuw";
import { maakOfferte } from "@/app/lib/offerte/opslag";

export type MaakOfferteResultaat = { ok: true; offerteId: string } | { ok: false; reden: "ontbreekt" | "niet-gevonden"; error: string };

// "Offerte maken" vanuit een lead: één nieuwe offerte (versie 1) met secties en
// losse regels uit de berekening. Idempotent: bestaat er al een offerte voor
// deze lead, dan wordt die geopend.
export async function maakOfferteV2Action(leadId: string): Promise<MaakOfferteResultaat> {
  const { company } = await requireActiveCompany();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: company.id }, include: { offertesV2: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!lead) return { ok: false, reden: "niet-gevonden", error: "Deze lead bestaat niet meer." };
  if (lead.offertesV2[0]) return { ok: true, offerteId: lead.offertesV2[0].id };

  const gegevens = await laadOfferteGegevens(company);
  if (ontbrekendeVerplichteGegevens(gegevens).length > 0) return { ok: false, reden: "ontbreekt", error: "Er ontbreken nog gegevens voor op de offerte." };

  const branding = await prisma.branding.findUnique({ where: { toolId: lead.toolId }, select: { primaireKleur: true, lettertype: true } });
  const mogenHuisstijl = effectiveTier(company) !== "GRATIS";
  const huisstijl = { kleur: mogenHuisstijl ? (branding?.primaireKleur ?? "#15803d") : "#15803d", lettertype: mogenHuisstijl ? (branding?.lettertype ?? "MODERN") : "MODERN" };

  if (lead.status === "EXTERN_AFGEHANDELD") await prisma.lead.update({ where: { id: lead.id }, data: { status: "IN_BEHANDELING" } });

  const { id } = await maakOfferte(prismaBasis, {
    companyId: company.id,
    leadId: lead.id,
    prefix: gegevens.nummerPrefix,
    bouw: (nummer) => bouwInhoudUitLead({ nummer, lead, gegevens, huisstijl }).inhoud,
  });
  revalidatePath("/dashboard/leads");
  return { ok: true, offerteId: id };
}
