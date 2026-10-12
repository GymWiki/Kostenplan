import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { stuurPush } from "@/app/lib/push/versturen";
import type { OfferteInhoud } from "./model";

export type MeldingSoort = "bekeken" | "akkoord" | "vraag" | "afgewezen";

export const MELDING_TITEL: Record<MeldingSoort, (nr: string, naam: string) => string> = {
  bekeken: (nr, naam) => `${naam} heeft offerte ${nr} bekeken`,
  akkoord: (nr, naam) => `${naam} is akkoord met offerte ${nr}`,
  vraag: (nr, naam) => `${naam} heeft een vraag over offerte ${nr}`,
  afgewezen: (nr, naam) => `${naam} heeft offerte ${nr} afgewezen`,
};

// Meldt de hovenier dat de klant iets met de offerte deed: in de app (stip bij Leads en melding in
// Overzicht, via OfferteV2.reactieGezien en de gebeurtenissen) en, als die al bestaat, als push.
// Geen e-mail. Faalt nooit.
export async function meldHovenier({ companyId, leadId, inhoud, soort, tekst }: { companyId: string; leadId: string | null; inhoud: OfferteInhoud; soort: MeldingSoort; tekst?: string }): Promise<void> {
  await prismaBasis.offerteV2.updateMany({ where: { companyId, nummer: inhoud.nummer }, data: { reactieGezien: false } }).catch(() => undefined);
  try {
    await stuurPush(companyId, {
      titel: MELDING_TITEL[soort](inhoud.nummer, inhoud.klant.naam || "De klant"),
      tekst: tekst ? tekst.slice(0, 120) : inhoud.onderwerp,
      url: leadId ? `/dashboard/leads/${leadId}/offerte` : "/dashboard/leads",
    });
  } catch {
    // push is een bijzaak
  }
}
