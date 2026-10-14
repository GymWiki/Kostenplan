import { berekenTotalen } from "./bereken";
import type { OfferteInhoud } from "./model";
import { MINIMUM_OMSCHRIJVING } from "./uit-lead";

// De regel "Aanvulling tot minimumtarief" zo instellen dat het totaal van de offerte precies op het minimumbedrag
// uitkomt: eerst het totaal zonder die regel, dan de aanvulling als verschil. Door het afronden per regel past niet
// elk bedrag in hele centen; dan wordt het kleinste bedrag genomen dat er niet onder zit (nooit eronder).
export function stelMinimumExactIn(inhoud: OfferteInhoud, minimumInclCenten: number): OfferteInhoud {
  if (!(minimumInclCenten > 0)) return inhoud;
  const zonder: OfferteInhoud = { ...inhoud, secties: inhoud.secties.map((s) => ({ ...s, regels: s.regels.filter((r) => r.omschrijving !== MINIMUM_OMSCHRIJVING) })) };
  const regel = inhoud.secties.flatMap((s) => s.regels).find((r) => r.omschrijving === MINIMUM_OMSCHRIJVING);
  if (!regel) return inhoud;
  const voor = berekenTotalen(zonder).totaalIncl;
  const tekort = minimumInclCenten - voor;
  if (tekort <= 0) return zonder; // het minimum is al gehaald zonder aanvulling
  const metPrijs = (prijsCenten: number): OfferteInhoud => ({ ...inhoud, secties: inhoud.secties.map((s) => ({ ...s, regels: s.regels.map((r) => (r.id === regel.id ? { ...r, prijsCenten } : r)) })) });
  const start = Math.max(1, Math.round((tekort * 100) / (100 + regel.btw)) - 4);
  let eerstBoven: number | null = null;
  for (let x = start; x <= start + 12; x++) {
    const t = berekenTotalen(metPrijs(x)).totaalIncl;
    if (t === minimumInclCenten) return metPrijs(x);
    if (t > minimumInclCenten && eerstBoven === null) eerstBoven = x;
  }
  return metPrijs(eerstBoven ?? start + 4);
}
