import type { Expression, PriceRule } from "@/app/lib/calculator-engine";
import { formatCurrency } from "@/app/lib/format";
import type { BeschikbareVariabele } from "./variabelen-utils";

// Vertaalt een PriceRule naar één leesbare regel voor in de rijweergave
// (Deel 8 van de UI/UX-herontwerpopdracht: "[Oppervlakte] × [€45] per [m²]"
// i.p.v. alleen de categorie tonen) — puur presentationeel, verandert niets
// aan hoe de regel daadwerkelijk doorgerekend wordt.
function labelVoorVariabele(naam: string, variabelen: BeschikbareVariabele[]): string {
  return variabelen.find((v) => v.naam === naam)?.label ?? naam;
}

function bedragTekst(expr: Expression | undefined, variabelen: BeschikbareVariabele[]): string {
  if (!expr) return formatCurrency(0);
  if (expr.kind === "GETAL") return formatCurrency(expr.waarde);
  if (expr.kind === "VARIABELE") return labelVoorVariabele(expr.naam, variabelen);
  return "een berekend bedrag";
}

function percentageTekst(expr: Expression | undefined, variabelen: BeschikbareVariabele[]): string {
  if (!expr) return "0%";
  if (expr.kind === "GETAL") return `${expr.waarde}%`;
  if (expr.kind === "VARIABELE") return labelVoorVariabele(expr.naam, variabelen);
  return "een berekend percentage";
}

function variabeleTekst(expr: Expression | undefined, variabelen: BeschikbareVariabele[]): string {
  if (!expr) return "?";
  if (expr.kind === "VARIABELE") return labelVoorVariabele(expr.naam, variabelen);
  if (expr.kind === "GETAL") return String(expr.waarde);
  return "een berekende waarde";
}

export function regelSamenvatting(regel: PriceRule, variabelen: BeschikbareVariabele[]): string {
  switch (regel.type) {
    case "VAST":
      return `Vast bedrag: ${bedragTekst(regel.bedrag, variabelen)}`;
    case "TOESLAG":
      return `Toeslag: ${bedragTekst(regel.bedrag, variabelen)}`;
    case "PER_EENHEID":
      return `${variabeleTekst(regel.hoeveelheid, variabelen)} × ${bedragTekst(regel.prijsPerEenheid, variabelen)} per ${regel.eenheid || "eenheid"}`;
    case "PERCENTAGE":
      return `${percentageTekst(regel.percentage, variabelen)} van het bedrag tot nu toe`;
    case "KORTING":
      return regel.percentage
        ? `Korting: ${percentageTekst(regel.percentage, variabelen)}`
        : `Korting: ${bedragTekst(regel.bedrag, variabelen)}`;
    case "STAFFEL":
      return `Staffelprijs per ${regel.eenheid || "eenheid"} (${regel.schijven.length} ${regel.schijven.length === 1 ? "schijf" : "schijven"})`;
    case "FORMULE":
      return "Aangepaste formule";
  }
}
