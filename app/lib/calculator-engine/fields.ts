import type { CalculatorField, DerivedVariable, VariableType } from "./types";
import { evaluateExpression, type ExpressionScope } from "./expression";

// ---------------------------------------------------------------------------
// De generieke input-engine (Deel 10-13 van de opdracht). Twee dingen staan
// hier los van elkaar:
//  1. Welk VariableType een veld oplevert (voor validatie/builder-hints).
//  2. Hoe een veld (met AFMETINGEN als bijzonder geval) uiteindelijk waarden
//     in de expressie-scope zet — inclusief automatisch afgeleide
//     variabelen (oppervlakte/volume), zie Deel 12.
// ---------------------------------------------------------------------------

export function veldVariabeleType(veld: CalculatorField): VariableType {
  switch (veld.soort) {
    case "NUMMER":
    case "AANTAL":
    case "OPPERVLAKTE":
    case "SLIDER":
      return "NUMBER";
    case "JA_NEE":
    case "CHECKBOX":
      return "BOOLEAN";
    case "DROPDOWN":
    case "RADIO":
    case "PRODUCT_KEUZE":
      return "OPTION";
    case "TEKST":
      return "TEXT";
    case "AFMETINGEN":
      // Het AFMETINGEN-veld zelf levert geen eigen variabele op — alleen de
      // afgeleide lengte/breedte/(hoogte)/oppervlakte/(volume)-variabelen,
      // zie afmetingenSubvariabelen() hieronder.
      return "NUMBER";
  }
}

// Namen van de sub-variabelen die een AFMETINGEN-veld met id `veldId`
// automatisch aanmaakt. `metVolume` is alleen aanwezig als het veld hoogte
// meeneemt (metHoogte: true, zie types.ts).
export function afmetingenSubvariabelen(veldId: string, metHoogte: boolean) {
  return {
    lengte: `${veldId}Lengte`,
    breedte: `${veldId}Breedte`,
    hoogte: metHoogte ? `${veldId}Hoogte` : null,
    oppervlakte: `${veldId}Oppervlakte`,
    volume: metHoogte ? `${veldId}Volume` : null,
  };
}

// Naam van de automatisch afgeleide prijsvariabele van een PRODUCT_KEUZE-veld
// (Deel 11: "levert automatisch een NUMBER-variabele ${id}Prijs").
export function productKeuzePrijsVariabele(veldId: string) {
  return `${veldId}Prijs`;
}

export type RuweVeldWaarden = Record<string, unknown>;

// Coerceert ruwe klantinvoer (uit de calculator-UI, of demo-waarden voor de
// live preview) naar een typed ExpressionScope, inclusief alle automatisch
// afgeleide variabelen. Dit is de brug tussen "wat de klant heeft ingevuld"
// en "wat de expressie-/prijsregel-engine kan gebruiken" — vergelijkbaar met
// coerceVeldWaarden() in sjablonen.ts, maar dan generiek voor elk veldtype
// i.p.v. per sjabloon.
export function bouwScope(
  velden: CalculatorField[],
  waarden: RuweVeldWaarden,
  materiaalPrijzen: Record<string, number> = {}
): ExpressionScope {
  const scope: ExpressionScope = {};

  for (const veld of velden) {
    const ruw = waarden[veld.id];

    switch (veld.soort) {
      case "NUMMER":
      case "AANTAL":
      case "OPPERVLAKTE":
      case "SLIDER":
        scope[veld.id] = parseGetal(ruw, veld.standaardWaarde ?? 0);
        break;
      case "JA_NEE":
      case "CHECKBOX":
        scope[veld.id] = ruw === true || ruw === "true";
        break;
      case "DROPDOWN":
      case "RADIO":
        scope[veld.id] = typeof ruw === "string" ? ruw : (veld.standaardWaarde ?? "");
        break;
      case "TEKST":
        scope[veld.id] = typeof ruw === "string" ? ruw : (veld.standaardWaarde ?? "");
        break;
      case "AFMETINGEN": {
        const namen = afmetingenSubvariabelen(veld.id, veld.metHoogte);
        const invoer = (typeof ruw === "object" && ruw !== null ? ruw : {}) as Record<string, unknown>;
        const lengte = parseGetal(invoer.lengte, 0);
        const breedte = parseGetal(invoer.breedte, 0);
        const hoogte = veld.metHoogte ? parseGetal(invoer.hoogte, 0) : null;
        scope[namen.lengte] = lengte;
        scope[namen.breedte] = breedte;
        if (namen.hoogte) scope[namen.hoogte] = hoogte ?? 0;
        const oppervlakte = lengte * breedte;
        scope[namen.oppervlakte] = oppervlakte;
        if (namen.volume) scope[namen.volume] = oppervlakte * (hoogte ?? 0);
        break;
      }
      case "PRODUCT_KEUZE": {
        const optieId = typeof ruw === "string" ? ruw : "";
        scope[veld.id] = optieId;
        scope[productKeuzePrijsVariabele(veld.id)] = materiaalPrijzen[optieId] ?? 0;
        break;
      }
    }
  }

  return scope;
}

// Voegt afgeleide variabelen (Deel 9: bijv. oppervlakte = lengte × breedte
// via een expliciete regel, i.p.v. een AFMETINGEN-veld) toe aan een scope
// die al de veld-variabelen bevat. Wordt na bouwScope() aangeroepen zodat
// een afgeleide variabele naar veldvariabelen mag verwijzen (maar niet
// andersom, en niet naar een andere afgeleide variabele die zelf nog niet is
// berekend — zie validate.ts voor de bijbehorende builder-check).
export function pasAfgeleideVariabelenToe(
  scope: ExpressionScope,
  afgeleideVariabelen: DerivedVariable[]
): ExpressionScope {
  const resultaat = { ...scope };
  for (const variabele of afgeleideVariabelen) {
    resultaat[variabele.id] = evaluateExpression(variabele.expression, resultaat);
  }
  return resultaat;
}

// Zelfde normalisatie als parseGetal() in sjablonen.ts (komma -> punt,
// lege/ongeldige invoer -> standaard) — hier opnieuw gedefinieerd i.p.v.
// geïmporteerd om dit bestand onafhankelijk te houden van het oude
// sjabloon-systeem; de twee mogen onafhankelijk evolueren.
export function parseGetal(ruw: unknown, standaard = 0): number {
  if (typeof ruw === "number") return Number.isFinite(ruw) ? ruw : standaard;
  if (typeof ruw !== "string") return standaard;
  const genormaliseerd = ruw.trim().replace(",", ".");
  if (genormaliseerd === "") return standaard;
  const getal = Number(genormaliseerd);
  return Number.isFinite(getal) ? getal : standaard;
}
