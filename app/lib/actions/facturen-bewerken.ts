"use server";

import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { parseFactuurInhoud } from "@/app/lib/factuur/schema";
import { bewaarFactuurConcept, FactuurVergrendeldFout } from "@/app/lib/factuur/opslag";

export type BewaarFactuurResultaat = { ok: true } | { ok: false; vergrendeld?: boolean; error: string };

// Autosave van het concept. Een definitieve factuur wordt nooit overschreven (ook niet bij een directe aanroep).
export async function bewaarFactuurAction(factuurId: string, inhoud: unknown): Promise<BewaarFactuurResultaat> {
  const { company } = await requireActiveCompany();
  const p = parseFactuurInhoud(inhoud);
  if (!p.ok) return { ok: false, error: p.error };
  try {
    await bewaarFactuurConcept(prismaBasis, { factuurId, companyId: company.id, inhoud: p.inhoud });
    return { ok: true };
  } catch (e) {
    if (e instanceof FactuurVergrendeldFout) return { ok: false, vergrendeld: true, error: e.message };
    console.error("[factuur] bewaren mislukt", e);
    return { ok: false, error: "Opslaan is niet gelukt." };
  }
}
