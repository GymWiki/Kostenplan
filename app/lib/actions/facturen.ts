"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { afzenderUit } from "@/app/lib/offerte/nieuw";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import type { OfferteInhoud } from "@/app/lib/offerte/model";
import { eenFactuurUitOfferte, eindfactuurUitOfferte, losseFactuur, termijnFactuurUitOfferte, termijnPlan, type EerdereFactuur, type OfferteBron } from "@/app/lib/factuur/maak";
import { maakFactuurConcept } from "@/app/lib/factuur/opslag";
import type { FactuurInhoud } from "@/app/lib/factuur/model";

export type FactuurMaakResultaat = { ok: true; factuurIds: string[]; eerste: string } | { ok: false; error: string; bestaande?: string[] };

// De geaccepteerde versie van een offerte met de optionele regels die de klant koos.
async function laadGeaccepteerd(companyId: string, offerteId: string): Promise<{ bron: OfferteBron; leadId: string | null } | { fout: string }> {
  const o = await prismaBasis.offerteV2.findFirst({
    where: { id: offerteId, companyId },
    include: { akkoorden: { orderBy: { tijdstip: "desc" }, take: 1 }, versies: { omit: { pdfData: true } } },
  });
  if (!o) return { fout: "Offerte niet gevonden." };
  const akkoord = o.akkoorden[0];
  if (o.status !== "GEACCEPTEERD" || !akkoord) return { fout: "Je kunt een factuur maken zodra de klant akkoord heeft gegeven op de offerte." };
  const versie = o.versies.find((v) => v.id === akkoord.versieId);
  if (!versie) return { fout: "De geaccepteerde versie van de offerte is niet gevonden." };
  return { bron: { inhoud: versie.inhoud as unknown as OfferteInhoud, gekozenOptioneel: (akkoord.gekozenRegelIds as string[]) ?? [], nummer: o.nummer, versie: versie.versie }, leadId: o.leadId };
}

// De huidige bedrijfsgegevens in de afzender van het concept (bij definitief maken wordt dit opnieuw vastgelegd).
async function instellingenEnAfzender(company: Parameters<typeof laadOfferteGegevens>[0], huisstijl: { kleur: string; lettertype: string }) {
  const gegevens = await laadOfferteGegevens(company);
  return { instellingen: { betaaltermijnDagen: gegevens.factuurBetaaltermijnDagen }, afzender: afzenderUit(gegevens, huisstijl) };
}

const metAfzender = (inhoud: FactuurInhoud, afzender: FactuurInhoud["afzender"]): FactuurInhoud => ({ ...inhoud, afzender });

// "Factuur maken" op een geaccepteerde offerte: één factuur voor het totaal, of termijnfacturen volgens de
// betaaltermijnen van de offerte (de eindfactuur volgt zodra de termijnen definitief zijn).
export async function maakFactuurUitOfferteAction(offerteId: string, keuze: "totaal" | "termijnen"): Promise<FactuurMaakResultaat> {
  const { company } = await requireActiveCompany();
  const g = await laadGeaccepteerd(company.id, offerteId);
  if ("fout" in g) return { ok: false, error: g.fout };
  const bestaand = await prismaBasis.factuur.findMany({ where: { companyId: company.id, offerteId, type: { not: "CREDITNOTA" } }, select: { id: true } });
  if (bestaand.length > 0) return { ok: false, error: "Er bestaat al een factuur voor deze offerte. Open die, of maak de eindfactuur.", bestaande: bestaand.map((b) => b.id) };

  const { instellingen, afzender } = await instellingenEnAfzender(company, { kleur: g.bron.inhoud.afzender.kleur, lettertype: g.bron.inhoud.afzender.lettertype });
  const bouwen: FactuurInhoud[] = [];
  if (keuze === "totaal") {
    bouwen.push(metAfzender(eenFactuurUitOfferte(g.bron, instellingen), afzender));
  } else {
    const plan = termijnPlan(g.bron.inhoud.betaaltermijnen);
    if (plan.length === 1) bouwen.push(metAfzender(eenFactuurUitOfferte(g.bron, instellingen), afzender));
    else for (const t of plan.filter((x) => x.soort === "termijn")) bouwen.push(metAfzender(termijnFactuurUitOfferte(g.bron, t, instellingen), afzender));
  }
  const ids: string[] = [];
  for (const inhoud of bouwen) ids.push((await maakFactuurConcept(prismaBasis, { companyId: company.id, leadId: g.leadId, offerteId, offerteVersie: g.bron.versie, inhoud })).id);
  revalidatePath("/dashboard/leads");
  return { ok: true, factuurIds: ids, eerste: ids[0] };
}

// De eindfactuur: alle regels met het werkelijke resultaat, min wat al is gefactureerd ("Reeds gefactureerd: F2026-0004").
export async function maakEindfactuurAction(offerteId: string): Promise<FactuurMaakResultaat> {
  const { company } = await requireActiveCompany();
  const g = await laadGeaccepteerd(company.id, offerteId);
  if ("fout" in g) return { ok: false, error: g.fout };
  const alle = await prismaBasis.factuur.findMany({ where: { companyId: company.id, offerteId, type: { not: "CREDITNOTA" } }, select: { id: true, nummer: true, status: true, type: true, inhoud: true } });
  if (alle.some((f) => f.type === "EINDFACTUUR")) return { ok: false, error: "Er is al een eindfactuur voor deze offerte.", bestaande: alle.filter((f) => f.type === "EINDFACTUUR").map((f) => f.id) };
  const open = alle.filter((f) => f.status === "CONCEPT");
  if (open.length > 0) return { ok: false, error: "Maak eerst de eerdere termijnfacturen definitief: de eindfactuur trekt ze af met hun factuurnummer.", bestaande: open.map((f) => f.id) };
  const eerder: EerdereFactuur[] = alle.filter((f) => f.status !== "GECREDITEERD" && f.nummer).map((f) => ({ nummer: f.nummer as string, inhoud: f.inhoud as unknown as FactuurInhoud }));
  const { instellingen, afzender } = await instellingenEnAfzender(company, { kleur: g.bron.inhoud.afzender.kleur, lettertype: g.bron.inhoud.afzender.lettertype });
  const inhoud = metAfzender(eindfactuurUitOfferte(g.bron, eerder, instellingen), afzender);
  const { id } = await maakFactuurConcept(prismaBasis, { companyId: company.id, leadId: g.leadId, offerteId, offerteVersie: g.bron.versie, inhoud });
  revalidatePath("/dashboard/leads");
  return { ok: true, factuurIds: [id], eerste: id };
}

// Losse factuur zonder offerte, vanuit een lead (klantgegevens worden overgenomen) of helemaal leeg.
export async function maakLosseFactuurAction(leadId: string | null): Promise<FactuurMaakResultaat> {
  const { company } = await requireActiveCompany();
  const lead = leadId ? await prismaBasis.lead.findFirst({ where: { id: leadId, companyId: company.id }, select: { id: true, naam: true, email: true, telefoonnummer: true } }) : null;
  if (leadId && !lead) return { ok: false, error: "Deze lead bestaat niet meer." };
  const { instellingen, afzender } = await instellingenEnAfzender(company, { kleur: "#15803d", lettertype: "MODERN" });
  const inhoud = losseFactuur({ afzender, klant: lead ? { naam: lead.naam, email: lead.email, telefoon: lead.telefoonnummer ?? "" } : undefined }, instellingen);
  const { id } = await maakFactuurConcept(prismaBasis, { companyId: company.id, leadId: lead?.id ?? null, offerteId: null, offerteVersie: null, inhoud });
  revalidatePath("/dashboard/leads");
  return { ok: true, factuurIds: [id], eerste: id };
}
