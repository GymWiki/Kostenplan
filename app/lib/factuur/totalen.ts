import { berekenTotalen } from "@/app/lib/offerte/bereken";
import type { FactuurInhoud } from "./model";

// Totalen van een factuur: dezelfde berekening als de offerte (per regel afgerond), met btw verlegd en KOR als
// "geen btw". Bij een creditnota zijn de bedragen negatief.
export function factuurTotalen(inhoud: FactuurInhoud) {
  const t = berekenTotalen(inhoud);
  return { ...t, totaalExclCenten: t.totaalExcl, totaalBtwCenten: t.totaalBtw, totaalInclCenten: t.totaalIncl };
}

// Wat de klant moet betalen: bij particulieren het bedrag incl. btw, anders (zakelijk) incl. btw ook — een zakelijke
// klant betaalt het totaal incl. btw; alleen bij KOR of btw verlegd is het totaal gelijk aan het bedrag excl.
export const teBetalen = (inhoud: FactuurInhoud) => factuurTotalen(inhoud).totaalIncl;
