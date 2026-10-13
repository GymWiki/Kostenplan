"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";

type Resultaat = { ok: true } | { ok: false; error: string };

const WEEK = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const DAG = /^\d{4}-\d{2}-\d{2}$/;

async function eigenLead(leadId: string) {
  const { company } = await requireActiveCompany();
  const lead = await prismaBasis.lead.findFirst({ where: { id: leadId, companyId: company.id }, select: { id: true, status: true } });
  return lead;
}
const ververs = () => {
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
};

export async function zetInContactAction(leadId: string): Promise<Resultaat> {
  const lead = await eigenLead(leadId);
  if (!lead) return { ok: false, error: "Lead niet gevonden." };
  await prismaBasis.lead.update({
    where: { id: leadId },
    data: { inContactOp: new Date(), ...(lead.status === "NIEUW" ? { status: "IN_BEHANDELING" as const } : {}), gebeurtenissen: { create: { soort: "IN_CONTACT" } } },
  });
  ververs();
  return { ok: true };
}

// Ingepland met een startweek (bijv. 2026-W45).
export async function planInAction(leadId: string, startweek: string): Promise<Resultaat> {
  if (!WEEK.test(startweek)) return { ok: false, error: "Kies een startweek." };
  if (!(await eigenLead(leadId))) return { ok: false, error: "Lead niet gevonden." };
  await prismaBasis.lead.update({ where: { id: leadId }, data: { ingeplandStartweek: startweek, ingeplandOp: new Date(), gebeurtenissen: { create: { soort: "INGEPLAND", tekst: startweek } } } });
  ververs();
  return { ok: true };
}

// Opgeleverd op een datum; die datum is ook de voorgestelde uitvoeringsdatum van de factuur.
export async function markeerOpgeleverdAction(leadId: string, datum: string): Promise<Resultaat> {
  if (!DAG.test(datum)) return { ok: false, error: "Kies de opleverdatum." };
  if (!(await eigenLead(leadId))) return { ok: false, error: "Lead niet gevonden." };
  await prismaBasis.lead.update({ where: { id: leadId }, data: { opgeleverdOp: new Date(`${datum}T00:00:00Z`), gebeurtenissen: { create: { soort: "OPGELEVERD", tekst: datum.split("-").reverse().join("-") } } } });
  ververs();
  return { ok: true };
}

export async function markeerVerlorenAction(leadId: string, reden: string): Promise<Resultaat> {
  const r = reden.trim();
  if (!r) return { ok: false, error: "Kies of schrijf een reden." };
  if (!(await eigenLead(leadId))) return { ok: false, error: "Lead niet gevonden." };
  await prismaBasis.lead.update({ where: { id: leadId }, data: { status: "VERLOREN", verlorenReden: r.slice(0, 200), verlorenOp: new Date(), gebeurtenissen: { create: { soort: "VERLOREN", tekst: r.slice(0, 200) } } } });
  ververs();
  return { ok: true };
}

export async function heropenLeadAction(leadId: string): Promise<Resultaat> {
  if (!(await eigenLead(leadId))) return { ok: false, error: "Lead niet gevonden." };
  await prismaBasis.lead.update({ where: { id: leadId }, data: { status: "IN_BEHANDELING", verlorenReden: null, verlorenOp: null, gebeurtenissen: { create: { soort: "HERSTELD" } } } });
  ververs();
  return { ok: true };
}
