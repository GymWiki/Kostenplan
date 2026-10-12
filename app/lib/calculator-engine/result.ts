import { applyPrijsAfronding } from "@/app/lib/tools";
import { rondCenten } from "@/app/lib/pricing/rond";
import { totalenVanRegels } from "@/app/lib/pricing/totalen";
import type { CalculatorResultSettings } from "./types";
import type { EvaluatedLineItem, PriceRuleEvaluationResult } from "./pricing";

// ---------------------------------------------------------------------------
// De result-engine (Deel 15-16). Zet de platte lijst regel-uitkomsten van de
// prijsregel-engine om in het generieke resultaat dat de calculator-UI en de
// LeadSnapshot nodig hebben: categorietotalen, btw, eindtotaal (en bij
// weergave "RANGE" een min/max) — afgerond volgens resultaatInstellingen
// (Deel 14). Vergelijkbaar met calculateBreakdown()/calculateBreakdownRange()
// in het bestaande calculate.ts, maar dan generiek over willekeurige
// PriceRule's i.p.v. de vaste vier kostenblokken.
// ---------------------------------------------------------------------------

export type EngineResult = {
  lineItems: EvaluatedLineItem[];
  materiaal: number;
  arbeid: number;
  transport: number;
  toeslagen: number;
  // Positief bedrag = hoeveel er is afgetrokken (voor weergave), niet het
  // (negatieve) getekende bedrag zoals in lineItems.
  kortingen: number;
  overig: number;
  subtotaal: number;
  btw: number;
  totaal: number;
  totaalMin?: number;
  totaalMax?: number;
  heeftGeldigeInvoer: boolean;
};

export function bouwResultaat(
  evaluatie: PriceRuleEvaluationResult,
  {
    btwPercentage,
    resultaatInstellingen,
    heeftGeldigeInvoer,
  }: { btwPercentage: number; resultaatInstellingen: CalculatorResultSettings; heeftGeldigeInvoer: boolean }
): EngineResult {
  // Zelfde afrondingsregel als de rekenkern (app/lib/pricing): elke regel op hele centen, de btw per
  // regel, het totaal is de som van de regels.
  const cents = (euro: number) => rondCenten(euro * 100);
  const som = { MATERIAAL: 0, ARBEID: 0, TRANSPORT: 0, TOESLAG: 0, KORTING: 0, OVERIG: 0 };
  const regels = evaluatie.lineItems.map((item) => {
    const bedrag = cents(item.bedrag);
    som[item.categorie] += item.categorie === "KORTING" ? Math.abs(bedrag) : bedrag;
    return { bedragExclCenten: bedrag, btwPercentage };
  });
  const totalen = totalenVanRegels(regels);
  const subtotaal = totalen.subtotaalExclCenten / 100;
  const btw = totalen.btwCenten / 100;
  const totaalOnafgerond = Math.max(0, totalen.totaalInclCenten) / 100;
  const totaal = applyPrijsAfronding(totaalOnafgerond, resultaatInstellingen.afronding);
  const [materiaal, arbeid, transport, toeslagen, kortingen, overig] = [som.MATERIAAL, som.ARBEID, som.TRANSPORT, som.TOESLAG, som.KORTING, som.OVERIG].map((c) => c / 100);

  const basis: EngineResult = {
    lineItems: evaluatie.lineItems,
    materiaal,
    arbeid,
    transport,
    toeslagen,
    kortingen,
    overig,
    subtotaal,
    btw,
    totaal,
    heeftGeldigeInvoer,
  };

  if (resultaatInstellingen.weergave === "RANGE" && heeftGeldigeInvoer) {
    return {
      ...basis,
      totaalMin: applyPrijsAfronding(
        totaalOnafgerond * (1 - resultaatInstellingen.bandbreedteMargeOmlaag / 100),
        resultaatInstellingen.afronding
      ),
      totaalMax: applyPrijsAfronding(
        totaalOnafgerond * (1 + resultaatInstellingen.bandbreedteMargeOmhoog / 100),
        resultaatInstellingen.afronding
      ),
    };
  }

  return basis;
}
