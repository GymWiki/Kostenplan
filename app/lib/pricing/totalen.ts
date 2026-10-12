import { rondCenten } from "./rond";

// Totalen uit regels: de enige plek waar btw en totalen worden opgeteld. Gebruikt door de
// rekenkern, door de offerte (bereken.ts) en door alles wat een totaal toont.
//
// Regel: de btw wordt per regel afgerond (op hele centen). Het totaal is de som van de regels,
// de btw per tarief is de som van de btw van die regels. Zo tellen de getoonde regels altijd op
// tot het getoonde totaal, voor particulier (bedragen incl. btw) én zakelijk (excl. btw).

export type TelRegel = { bedragExclCenten: number; btwPercentage: number };

export type BtwGroep = { tarief: number; grondslagCenten: number; btwCenten: number };

export type RegelTotaal = { exclCenten: number; btwCenten: number; inclCenten: number };

export type Totalen = {
  subtotaalExclCenten: number;
  btwGroepen: BtwGroep[];
  btwCenten: number;
  totaalInclCenten: number;
};

export function regelTotaal(bedragExclCenten: number, btwPercentage: number): RegelTotaal {
  const btwCenten = rondCenten((bedragExclCenten * btwPercentage) / 100);
  return { exclCenten: bedragExclCenten, btwCenten, inclCenten: bedragExclCenten + btwCenten };
}

export function totalenVanRegels(regels: readonly TelRegel[]): Totalen {
  const groepen = new Map<number, BtwGroep>();
  let subtotaal = 0;
  for (const r of regels) {
    const t = regelTotaal(r.bedragExclCenten, r.btwPercentage);
    subtotaal += t.exclCenten;
    const g = groepen.get(r.btwPercentage) ?? { tarief: r.btwPercentage, grondslagCenten: 0, btwCenten: 0 };
    g.grondslagCenten += t.exclCenten;
    g.btwCenten += t.btwCenten;
    groepen.set(r.btwPercentage, g);
  }
  const btwGroepen = [...groepen.values()].sort((a, b) => b.tarief - a.tarief);
  const btwCenten = btwGroepen.reduce((s, g) => s + g.btwCenten, 0);
  return { subtotaalExclCenten: subtotaal, btwGroepen, btwCenten, totaalInclCenten: subtotaal + btwCenten };
}
