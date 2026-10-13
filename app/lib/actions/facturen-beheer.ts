"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { BeheerFout, maakCreditnotaConcept, registreerBetaling, verwijderBetaling } from "@/app/lib/factuur/beheer";

type Resultaat = { ok: true } | { ok: false; error: string };

const betalingSchema = z.object({
  factuurId: z.string().min(1),
  bedragCenten: z.number().int(),
  datum: z.string(),
  methode: z.enum(["OVERBOEKING", "CONTANT", "PIN", "BETAALLINK", "OVERIG"]),
  notitie: z.string().max(300).optional(),
});

function ververs(factuurId: string) {
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/facturen");
  revalidatePath(`/dashboard/facturen/${factuurId}`);
}

const naarFout = (e: unknown): { ok: false; error: string } => {
  if (e instanceof BeheerFout) return { ok: false, error: e.message };
  console.error("[factuur] beheer mislukt", e);
  return { ok: false, error: "Dat is niet gelukt. Probeer het opnieuw." };
};

export async function registreerBetalingAction(invoer: z.infer<typeof betalingSchema>): Promise<Resultaat> {
  const { company } = await requireActiveCompany();
  const p = betalingSchema.safeParse(invoer);
  if (!p.success) return { ok: false, error: "Controleer het bedrag en de datum." };
  try {
    await registreerBetaling(prismaBasis, { ...p.data, companyId: company.id });
    ververs(p.data.factuurId);
    return { ok: true };
  } catch (e) {
    return naarFout(e);
  }
}

export async function verwijderBetalingAction(factuurId: string, betalingId: string): Promise<Resultaat> {
  const { company } = await requireActiveCompany();
  try {
    await verwijderBetaling(prismaBasis, { betalingId, companyId: company.id });
    ververs(factuurId);
    return { ok: true };
  } catch (e) {
    return naarFout(e);
  }
}

// Maakt een concept-creditnota (geheel of voor geselecteerde regels); de hovenier controleert en maakt hem definitief.
export async function maakCreditnotaAction(factuurId: string, regelIds?: string[]): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  try {
    const gegevens = await laadOfferteGegevens(company);
    const { id } = await maakCreditnotaConcept(prismaBasis, { factuurId, companyId: company.id, regelIds, instellingen: { betaaltermijnDagen: gegevens.factuurBetaaltermijnDagen } });
    ververs(factuurId);
    return { ok: true, id };
  } catch (e) {
    return naarFout(e);
  }
}
