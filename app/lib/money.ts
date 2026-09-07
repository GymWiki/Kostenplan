// Kleine, gedeelde geldhelpers — voorheen los in calculate.ts,
// calculator-engine/result.ts en offertes.ts gedupliceerd (drie keer
// letterlijk dezelfde `Math.round(x * 100) / 100`, drie keer dezelfde
// btw-vermenigvuldiging). Puur een extractie: elke aanroeper rondt het
// resultaat af (of niet) zoals hij dat al deed, dus geen gedragswijziging.

export function round2(waarde: number): number {
  return Math.round(waarde * 100) / 100;
}

export function berekenBtw(subtotaal: number, btwPercentage: number): number {
  return subtotaal * (btwPercentage / 100);
}
