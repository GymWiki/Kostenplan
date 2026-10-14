"use server";

import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { parseFactuurInhoud } from "@/app/lib/factuur/schema";
import type { FactuurInhoud } from "@/app/lib/factuur/model";
import { bewaarFactuurConcept, FactuurRevisieConflictFout, FactuurVergrendeldFout } from "@/app/lib/factuur/opslag";

export type BewaarFactuurResultaat = { ok: true; revisie: number } | { ok: false; vergrendeld?: boolean; conflict?: boolean; error: string };

// Autosave van het concept. Een definitieve factuur wordt nooit overschreven (ook niet bij een directe aanroep);
// een opslag op een verouderde stand (`revisie`) wordt geweigerd.
export async function bewaarFactuurAction(factuurId: string, inhoud: unknown, revisie: number): Promise<BewaarFactuurResultaat> {
  const { company } = await requireActiveCompany();
  const p = parseFactuurInhoud(inhoud);
  if (!p.ok) return { ok: false, error: p.error };
  if (!Number.isInteger(revisie) || revisie < 0) return { ok: false, error: "Opslaan is niet gelukt." };
  try {
    const nieuw = await bewaarFactuurConcept(prismaBasis, { factuurId, companyId: company.id, inhoud: p.inhoud, verwachteRevisie: revisie });
    return { ok: true, revisie: nieuw };
  } catch (e) {
    if (e instanceof FactuurRevisieConflictFout) return { ok: false, conflict: true, error: e.message };
    if (e instanceof FactuurVergrendeldFout) return { ok: false, vergrendeld: true, error: e.message };
    console.error("[factuur] bewaren mislukt", e);
    return { ok: false, error: "Opslaan is niet gelukt." };
  }
}

// De nieuwste opgeslagen stand van het concept (na "Nieuwste versie laden" bij een conflict).
export async function laadFactuurConceptAction(factuurId: string): Promise<{ ok: true; inhoud: FactuurInhoud; revisie: number } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const f = await prismaBasis.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, select: { inhoud: true, revisie: true } });
  if (!f) return { ok: false, error: "Factuur niet gevonden." };
  return { ok: true, inhoud: f.inhoud as unknown as FactuurInhoud, revisie: f.revisie };
}
