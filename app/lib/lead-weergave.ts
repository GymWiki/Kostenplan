import type { LeadSnapshot } from "@/app/lib/leads";

// Korte omschrijving van wat een klant aanvroeg: de eerste werkzaamheid en
// hoeveel er nog bij komen ("Terras +1"). Zonder server-afhankelijkheden,
// dus bruikbaar in de browser.
export function eersteRegelNaam(snapshot: unknown): string {
  const regels = (snapshot as Partial<LeadSnapshot> | null)?.regels;
  const eerste = regels?.[0]?.naam;
  if (!eerste) return "Aanvraag";
  return regels && regels.length > 1 ? `${eerste} +${regels.length - 1}` : eerste;
}
