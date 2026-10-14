import { describe, expect, it } from "vitest";
import { berekenTotalen } from "./bereken";
import { stelMinimumExactIn } from "./minimum";
import type { OfferteInhoud, OfferteRegel } from "./model";
import { MINIMUM_OMSCHRIJVING } from "./uit-lead";

let n = 0;
const r = (o: Partial<OfferteRegel>): OfferteRegel => ({ id: `r${++n}`, type: "normaal", omschrijving: "x", aantal: 1, eenheid: "post", prijsCenten: 10000, btw: 21, soort: "overig", ...o });
const inh = (regels: OfferteRegel[]) =>
  ({ secties: [{ id: "s", titel: "S", regels }], klant: { type: "particulier" }, afzender: { korActief: false }, rekenregel: 3 }) as unknown as OfferteInhoud;

describe("stelMinimumExactIn", () => {
  it("het totaal komt precies op het minimum (€ 1.500,00), de regel heet 'Aanvulling tot minimumtarief'", () => {
    const basis = inh([r({ prijsCenten: 81233 }), r({ aantal: 3, prijsCenten: 1999, btw: 9 }), r({ omschrijving: MINIMUM_OMSCHRIJVING, prijsCenten: 1 })]);
    const uit = stelMinimumExactIn(basis, 150000);
    const t = berekenTotalen(uit);
    expect(t.totaalIncl).toBe(150000);
    expect(uit.secties[0].regels.some((x) => x.omschrijving === "Aanvulling tot minimumtarief")).toBe(true);
  });

  it("nooit onder het minimum; exact zodra een bedrag in hele centen dat toelaat", () => {
    let exact = 0;
    let boven = 0;
    for (let basisPrijs = 70000; basisPrijs <= 70400; basisPrijs++) {
      const basis = inh([r({ prijsCenten: basisPrijs }), r({ omschrijving: MINIMUM_OMSCHRIJVING, prijsCenten: 1 })]);
      const t = berekenTotalen(stelMinimumExactIn(basis, 150000)).totaalIncl;
      expect(t).toBeGreaterThanOrEqual(150000);
      // is exact haalbaar? zoek in de buurt van het verwachte bedrag een aanvulling in hele centen die het precies maakt
      const voor = berekenTotalen(inh([r({ prijsCenten: basisPrijs })])).totaalIncl;
      const midden = Math.round(((150000 - voor) * 100) / 121);
      let haalbaar = false;
      for (let x = Math.max(1, midden - 30); x <= midden + 30 && !haalbaar; x++) {
        haalbaar = berekenTotalen(inh([r({ prijsCenten: basisPrijs }), r({ omschrijving: MINIMUM_OMSCHRIJVING, prijsCenten: x })])).totaalIncl === 150000;
      }
      if (haalbaar) {
        expect(t, `basis ${basisPrijs}`).toBe(150000);
        exact++;
      } else boven++;
    }
    expect(exact).toBeGreaterThan(0);
    expect(boven).toBeLessThan(exact);
  });

  it("zonder minimum, of als het minimum al gehaald is, verdwijnt de aanvulling", () => {
    const basis = inh([r({ prijsCenten: 200000 }), r({ omschrijving: MINIMUM_OMSCHRIJVING, prijsCenten: 5000 })]);
    expect(stelMinimumExactIn(basis, 150000).secties[0].regels).toHaveLength(1);
    expect(stelMinimumExactIn(basis, 0)).toBe(basis);
  });
});
