import { berekenTotalen, type Totalen } from "./bereken";
import type { OfferteInhoud } from "./model";

// De geldende inhoud van een offertestand: wat er op de offerte staat plus welke optionele regels de klant bij het
// akkoord koos. Eén plek, zodat het beheerscherm, de editor, de pdf en de factuur altijd hetzelfde totaal tonen
// (zonder akkoord telt geen enkele optionele regel mee).
export type GeldendeOfferte = { inhoud: OfferteInhoud; gekozenOptioneel: string[]; getekend: boolean; totalen: Totalen };

export function geldendeInhoud(versie: { inhoud: unknown; akkoorden?: readonly { gekozenRegelIds: unknown }[] | null }): GeldendeOfferte {
  const inhoud = versie.inhoud as OfferteInhoud;
  const akkoord = versie.akkoorden?.[0];
  const gekozenOptioneel = akkoord && Array.isArray(akkoord.gekozenRegelIds) ? (akkoord.gekozenRegelIds as string[]) : [];
  return { inhoud, gekozenOptioneel, getekend: Boolean(akkoord), totalen: berekenTotalen(inhoud, gekozenOptioneel) };
}
