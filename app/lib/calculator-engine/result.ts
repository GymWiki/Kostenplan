import { applyPrijsAfronding } from "@/app/lib/tools";
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

function round2(waarde: number) {
  return Math.round(waarde * 100) / 100;
}

export function bouwResultaat(
  evaluatie: PriceRuleEvaluationResult,
  {
    btwPercentage,
    resultaatInstellingen,
    heeftGeldigeInvoer,
  }: { btwPercentage: number; resultaatInstellingen: CalculatorResultSettings; heeftGeldigeInvoer: boolean }
): EngineResult {
  let materiaal = 0;
  let arbeid = 0;
  let transport = 0;
  let toeslagen = 0;
  let kortingen = 0;
  let overig = 0;

  for (const item of evaluatie.lineItems) {
    switch (item.categorie) {
      case "MATERIAAL":
        materiaal += item.bedrag;
        break;
      case "ARBEID":
        arbeid += item.bedrag;
        break;
      case "TRANSPORT":
        transport += item.bedrag;
        break;
      case "TOESLAG":
        toeslagen += item.bedrag;
        break;
      case "KORTING":
        kortingen += Math.abs(item.bedrag);
        break;
      case "OVERIG":
        overig += item.bedrag;
        break;
    }
  }

  const subtotaal = round2(evaluatie.subtotaal);
  const btw = round2(subtotaal * (btwPercentage / 100));
  const totaalOnafgerond = subtotaal + btw;
  const totaal = applyPrijsAfronding(totaalOnafgerond, resultaatInstellingen.afronding);

  const basis: EngineResult = {
    lineItems: evaluatie.lineItems,
    materiaal: round2(materiaal),
    arbeid: round2(arbeid),
    transport: round2(transport),
    toeslagen: round2(toeslagen),
    kortingen: round2(kortingen),
    overig: round2(overig),
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
