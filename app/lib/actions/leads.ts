"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { maakLead } from "@/app/lib/lead-aanmaken";
import { planLeadMail } from "@/app/lib/mail/plan-lead-mail";
import { leadNoteSchema, leadStatusSchema } from "@/app/lib/validation";

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
  let snapshotJson: unknown;
  try {
    snapshotJson = JSON.parse(String(formData.get("snapshot") ?? ""));
  } catch {
    return { error: "Ongeldige aanvraag. Ververs de pagina en probeer het opnieuw." };
  }

  let uitslag;
  try {
    uitslag = await maakLead({
      toolId,
      naam: formData.get("naam"),
      email: formData.get("email"),
      telefoonnummer: formData.get("telefoonnummer") ?? "",
      snapshot: snapshotJson,
      sleutel: formData.get("sleutel"),
    });
  } catch {
    return { error: "Versturen lukt nu even niet. Probeer het zo nog eens." };
  }
  if (!uitslag.ok) {
    return uitslag.fieldErrors ? { fieldErrors: uitslag.fieldErrors } : { error: uitslag.error };
  }

  if (!uitslag.dubbel) planLeadMail(uitslag.leadId);
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
