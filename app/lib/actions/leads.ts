"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { recordAnalyticsEvent } from "@/app/lib/actions/analytics";
import {
  leadContactSchema,
  leadNoteSchema,
  leadSnapshotSchema,
  leadStatusSchema,
} from "@/app/lib/validation";
import { effectiveTier } from "@/app/lib/subscription";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

// Aangeroepen vanuit het publieke klantenportaal (geen ingelogde gebruiker) —
// zie app/portaal/[slug]/calculator.tsx. Neemt een toolId (niet een slug):
// die is al server-side geresolved en op publicatie gecontroleerd door de
// aanroepende route (getToolForPublicRoute), dus hier alleen nog een lichte
// achtervang-check + de daadwerkelijke aanmaak.
export async function createLeadAction(
  toolId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const parsed = leadContactSchema.safeParse({
    naam: formData.get("naam"),
    email: formData.get("email"),
    telefoonnummer: formData.get("telefoonnummer") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  let snapshotJson: unknown;
  try {
    snapshotJson = JSON.parse(String(formData.get("snapshot") ?? ""));
  } catch {
    return { error: "Ongeldige aanvraag. Ververs de pagina en probeer het opnieuw." };
  }
  const snapshotParsed = leadSnapshotSchema.safeParse(snapshotJson);
  if (!snapshotParsed.success) {
    return { error: "Ongeldige aanvraag. Ververs de pagina en probeer het opnieuw." };
  }

  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null, status: "GEPUBLICEERD" },
    select: {
      id: true,
      naam: true,
      companyId: true,
      company: { select: { subscriptionTier: true, overrideTier: true } },
    },
  });
  if (!tool) {
    return { error: "Deze rekentool is niet (meer) beschikbaar." };
  }

  // Zelfde poort als de "Offerte aanvragen"-knop zelf (Plus/Pro-only) — een
  // rechtstreekse POST kan deze client-side gate omzeilen, dus hier nogmaals
  // afdwingen.
  if (effectiveTier(tool.company) === "GRATIS") {
    return { error: "Offertes aanvragen is niet beschikbaar voor dit bedrijf." };
  }

  await prisma.lead.create({
    data: {
      companyId: tool.companyId,
      toolId: tool.id,
      toolNaamSnapshot: tool.naam,
      naam: parsed.data.naam,
      email: parsed.data.email,
      telefoonnummer: parsed.data.telefoonnummer || null,
      snapshot: snapshotParsed.data,
      totaalIndicatie: snapshotParsed.data.totaal,
    },
  });

  await recordAnalyticsEvent(tool.companyId, tool.id, "LEAD");

  revalidatePath("/dashboard/leads");
  return { success: true };
}

export async function updateLeadStatusAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const leadId = formData.get("leadId");
  const parsed = leadStatusSchema.safeParse({ status: formData.get("status") });
  if (typeof leadId !== "string" || !parsed.success) return;

  await prisma.lead.updateMany({
    where: { id: leadId, companyId: company.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/dashboard/leads");
}

export async function addLeadNoteAction(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const { company } = await requireActiveCompany();

  const parsed = leadNoteSchema.safeParse({ tekst: formData.get("tekst") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId: company.id },
    select: { id: true },
  });
  if (!lead) return { error: "Lead niet gevonden" };

  await prisma.leadNote.create({ data: { leadId, tekst: parsed.data.tekst } });

  revalidatePath("/dashboard/leads");
  return { success: true };
}

export async function updateLeadNoteAction(
  noteId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const { company } = await requireActiveCompany();

  const parsed = leadNoteSchema.safeParse({ tekst: formData.get("tekst") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const note = await prisma.leadNote.findFirst({
    where: { id: noteId, lead: { companyId: company.id } },
    select: { id: true },
  });
  if (!note) return { error: "Notitie niet gevonden" };

  await prisma.leadNote.update({ where: { id: noteId }, data: { tekst: parsed.data.tekst } });

  revalidatePath("/dashboard/leads");
  return { success: true };
}

export async function deleteLeadNoteAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const noteId = formData.get("noteId");
  if (typeof noteId !== "string") return;

  const note = await prisma.leadNote.findFirst({
    where: { id: noteId, lead: { companyId: company.id } },
    select: { id: true },
  });
  if (!note) return;

  await prisma.leadNote.delete({ where: { id: noteId } });

  revalidatePath("/dashboard/leads");
}
