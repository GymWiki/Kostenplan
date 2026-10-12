import { bouwScope, pasAfgeleideVariabelenToe, veldIsIngevuld } from "./fields";
import { evalueerOnderdeel, combineerOnderdelen, type OnderdeelEvaluatie, type OnderdeelLineItem } from "./modulair";
import type { AnyCalculatorConfigData } from "./modulair-types";
import { evaluatePriceRules, type PriceRuleEvaluationResult } from "./pricing";
import { bouwResultaat, type EngineResult } from "./result";
import type { ExpressionScope } from "./expression";
import type { LeadSnapshot, LeadSnapshotLine } from "@/app/lib/leads";
import { hashConfig } from "@/app/lib/pricing/hash";

// De volledige berekening van een formule-gebaseerde ("Aangepaste") rekentool, op één plek: de browser
// gebruikt hem voor het scherm en de server rekent er een aanvraag mee na. Geld loopt via dezelfde
// afronding en btw-regel als de rekenkern (zie bouwResultaat in result.ts).

export type ModulairBerekening = {
  evaluatie: PriceRuleEvaluationResult;
  resultaat: EngineResult;
  heeftGeldigeInvoer: boolean;
  // Alleen bij versie 2 (onderdelen): de geïsoleerde evaluatie per onderdeel, ook voor veldzichtbaarheid.
  onderdeelEvaluaties: OnderdeelEvaluatie[];
  // Alleen bij versie 1: de ene scope over alle velden.
  scope: ExpressionScope;
};

// `waarden` zoals de rekentool ze bijhoudt: bij versie 2 per onderdeel genamespaced (`<onderdeel>::<veld>`).
export function berekenModulair({
  config,
  waarden,
  materiaalPrijzen,
  btwPercentage,
}: {
  config: AnyCalculatorConfigData;
  waarden: Record<string, unknown>;
  materiaalPrijzen: Record<string, number>;
  btwPercentage: number;
}): ModulairBerekening {
  if (config.versie === 2) {
    const onderdeelEvaluaties = config.onderdelen
      .filter((o) => o.actief)
      .map((o) => {
        const onderdeelWaarden: Record<string, unknown> = {};
        for (const veld of o.velden) onderdeelWaarden[veld.id] = waarden[`${o.id}::${veld.id}`];
        return evalueerOnderdeel(o, onderdeelWaarden, materiaalPrijzen, { alleenPubliek: true });
      });
    const evaluatie = combineerOnderdelen(onderdeelEvaluaties);
    const heeftGeldigeInvoer = onderdeelEvaluaties.every((e) => e.heeftGeldigeInvoer);
    return { evaluatie, resultaat: bouwResultaat(evaluatie, { btwPercentage, resultaatInstellingen: config.resultaatInstellingen, heeftGeldigeInvoer }), heeftGeldigeInvoer, onderdeelEvaluaties, scope: {} };
  }
  const scope = pasAfgeleideVariabelenToe(bouwScope(config.velden, waarden, materiaalPrijzen), config.afgeleideVariabelen);
  const evaluatie = evaluatePriceRules(config.regels, scope, { alleenPubliek: true });
  const heeftGeldigeInvoer = config.velden.every((veld) => veldIsIngevuld(veld, waarden[veld.id], scope));
  return { evaluatie, resultaat: bouwResultaat(evaluatie, { btwPercentage, resultaatInstellingen: config.resultaatInstellingen, heeftGeldigeInvoer }), heeftGeldigeInvoer, onderdeelEvaluaties: [], scope };
}

// De momentopname van zo'n aanvraag, gebouwd uit de berekening. Browser en server gebruiken deze functie.
export function bouwModulairSnapshot({
  config,
  waarden,
  berekening,
  bron = "client",
  afwijking,
}: {
  config: AnyCalculatorConfigData;
  waarden: Record<string, unknown>;
  berekening: ModulairBerekening;
  bron?: "server" | "client";
  afwijking?: { klantCenten: number; serverCenten: number };
}): LeadSnapshot {
  const { evaluatie, resultaat } = berekening;
  const zichtbaar = evaluatie.lineItems.filter((item) => item.toonInUitsplitsing && !item.intern);
  const regels: LeadSnapshotLine[] = (zichtbaar.length > 0 ? zichtbaar : evaluatie.lineItems).map((item) => ({
    naam: item.label,
    type: "dienst",
    prijs: item.bedrag,
    onderdeel: config.versie === 2 ? (item as OnderdeelLineItem).onderdeelNaam : undefined,
  }));
  return {
    regels,
    arbeidskosten: resultaat.arbeid,
    materiaalkosten: resultaat.materiaal,
    transportkosten: resultaat.transport,
    voorrijkosten: 0,
    subtotaal: resultaat.subtotaal,
    btw: resultaat.btw,
    totaal: resultaat.totaal,
    modulair: { versie: 1, bron, configHash: hashConfig(config), waarden, afwijking },
  };
}
