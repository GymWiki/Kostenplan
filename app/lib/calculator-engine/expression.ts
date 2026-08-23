import type { Expression } from "./types";

// ---------------------------------------------------------------------------
// De veilige expressie-interpreter (Deel 33 van de opdracht: "Gebruik geen
// eval(), gebruik geen dynamische JavaScript-executie vanuit
// databasevelden"). Een Expression is pure data (zie types.ts) — dit bestand
// is de ENIGE plek die 'm daadwerkelijk uitrekent, via een gewone,
// controleerbare switch over `expr.kind`. Er is geen enkel pad van
// configuratie-data naar JavaScript-executie.
// ---------------------------------------------------------------------------

// MEERKEUZE-velden (Deel 3 modulair) leveren een string[] op (welke opties
// zijn aangevinkt) — de enige niet-scalaire variabelewaarde die de engine
// kent. Alle scalaire coercies (asNumber/asBoolean/asString) behandelen een
// array als "leeg = 0/false/''" resp. "niet-leeg = waar"; het BEVAT-kind
// hieronder is de enige plek die de array-inhoud zelf inspecteert.
export type VariableValue = number | boolean | string | string[] | undefined;

export type ExpressionScope = Record<string, VariableValue>;

// Voorkomt dat een (per ongeluk of moedwillig) extreem diep geneste
// expressie de interpreter laat vastlopen — een normale, door de builder-UI
// gebouwde regel komt hier nooit ook maar in de buurt van.
const MAX_DIEPTE = 64;

export function asNumber(waarde: VariableValue): number {
  if (typeof waarde === "number") return Number.isFinite(waarde) ? waarde : 0;
  if (typeof waarde === "boolean") return waarde ? 1 : 0;
  if (typeof waarde === "string") {
    const genormaliseerd = waarde.trim().replace(",", ".");
    const getal = Number(genormaliseerd);
    return Number.isFinite(getal) ? getal : 0;
  }
  if (Array.isArray(waarde)) return 0;
  return 0;
}

function asBoolean(waarde: VariableValue): boolean {
  if (typeof waarde === "boolean") return waarde;
  if (typeof waarde === "number") return waarde !== 0;
  if (typeof waarde === "string") return waarde !== "" && waarde !== "false" && waarde !== "0";
  if (Array.isArray(waarde)) return waarde.length > 0;
  return false;
}

function asString(waarde: VariableValue): string {
  if (waarde == null) return "";
  if (Array.isArray(waarde)) return waarde.join(", ");
  return String(waarde);
}

export function asStringArray(waarde: VariableValue): string[] {
  if (Array.isArray(waarde)) return waarde;
  if (typeof waarde === "string" && waarde !== "") return [waarde];
  return [];
}

// Vergelijkt twee waarden op gelijkheid, type-bewust: twee getallen
// numeriek, twee booleans als boolean, anders als string (zodat een
// OPTION-variabele — altijd een string — gewoon met "==" op tekst vergeleken
// kan worden, precies wat een ALS-voorwaarde als "bereikbaarheid = slecht"
// nodig heeft).
function gelijk(a: VariableValue, b: VariableValue): boolean {
  if (typeof a === "number" || typeof b === "number") return asNumber(a) === asNumber(b);
  if (typeof a === "boolean" || typeof b === "boolean") return asBoolean(a) === asBoolean(b);
  return asString(a) === asString(b);
}

export function evaluateExpression(
  expr: Expression,
  scope: ExpressionScope,
  diepte = 0
): number | boolean | string | string[] {
  if (diepte > MAX_DIEPTE) {
    throw new Error("Expressie is te diep genest");
  }
  const gaVerder = (e: Expression) => evaluateExpression(e, scope, diepte + 1);

  switch (expr.kind) {
    case "GETAL":
      return expr.waarde;
    case "BOOLEAN":
      return expr.waarde;
    case "TEKST":
      return expr.waarde;
    case "VARIABELE":
      return scope[expr.naam] ?? 0;

    case "OPTELLEN":
      return expr.termen.reduce((som: number, term) => som + asNumber(gaVerder(term)), 0);
    case "AFTREKKEN":
      return asNumber(gaVerder(expr.links)) - asNumber(gaVerder(expr.rechts));
    case "VERMENIGVULDIGEN":
      return expr.factoren.reduce((product: number, factor) => product * asNumber(gaVerder(factor)), 1);
    case "DELEN": {
      const deler = asNumber(gaVerder(expr.rechts));
      if (deler === 0) return 0;
      return asNumber(gaVerder(expr.links)) / deler;
    }
    case "PERCENTAGE_VAN":
      return (asNumber(gaVerder(expr.basis)) * asNumber(gaVerder(expr.percentage))) / 100;

    case "GELIJK_AAN":
      return gelijk(gaVerder(expr.links), gaVerder(expr.rechts));
    case "NIET_GELIJK_AAN":
      return !gelijk(gaVerder(expr.links), gaVerder(expr.rechts));
    case "GROTER_DAN":
      return asNumber(gaVerder(expr.links)) > asNumber(gaVerder(expr.rechts));
    case "KLEINER_DAN":
      return asNumber(gaVerder(expr.links)) < asNumber(gaVerder(expr.rechts));
    case "GROTER_OF_GELIJK":
      return asNumber(gaVerder(expr.links)) >= asNumber(gaVerder(expr.rechts));
    case "KLEINER_OF_GELIJK":
      return asNumber(gaVerder(expr.links)) <= asNumber(gaVerder(expr.rechts));

    case "EN":
      return expr.voorwaarden.every((v) => asBoolean(gaVerder(v)));
    case "OF":
      return expr.voorwaarden.some((v) => asBoolean(gaVerder(v)));
    case "NIET":
      return !asBoolean(gaVerder(expr.voorwaarde));

    case "MINIMUM":
      return Math.min(...expr.waarden.map((w) => asNumber(gaVerder(w))));
    case "MAXIMUM":
      return Math.max(...expr.waarden.map((w) => asNumber(gaVerder(w))));

    case "ALS_DAN":
      return asBoolean(gaVerder(expr.voorwaarde)) ? gaVerder(expr.dan) : gaVerder(expr.anders);

    case "BEVAT":
      return asStringArray(gaVerder(expr.lijst)).includes(asString(gaVerder(expr.waarde)));
  }
}

export function evaluateAsNumber(expr: Expression, scope: ExpressionScope): number {
  return asNumber(evaluateExpression(expr, scope));
}

export function evaluateAsBoolean(expr: Expression, scope: ExpressionScope): boolean {
  return asBoolean(evaluateExpression(expr, scope));
}

// ---------------------------------------------------------------------------
// Introspectie — welke variabelen komt een expressie tegen? Gebruikt door de
// builder-validatie (Deel 32: "Deze prijsregel gebruikt 'oppervlakte', maar
// dit veld bestaat niet") om dat te kunnen controleren zonder de expressie
// daadwerkelijk uit te voeren.
// ---------------------------------------------------------------------------

export function variabelenInExpressie(expr: Expression, gevonden: Set<string> = new Set()): Set<string> {
  switch (expr.kind) {
    case "GETAL":
    case "BOOLEAN":
    case "TEKST":
      return gevonden;
    case "VARIABELE":
      gevonden.add(expr.naam);
      return gevonden;
    case "OPTELLEN":
      expr.termen.forEach((t) => variabelenInExpressie(t, gevonden));
      return gevonden;
    case "VERMENIGVULDIGEN":
      expr.factoren.forEach((f) => variabelenInExpressie(f, gevonden));
      return gevonden;
    case "AFTREKKEN":
    case "DELEN":
    case "GELIJK_AAN":
    case "NIET_GELIJK_AAN":
    case "GROTER_DAN":
    case "KLEINER_DAN":
    case "GROTER_OF_GELIJK":
    case "KLEINER_OF_GELIJK":
      variabelenInExpressie(expr.links, gevonden);
      variabelenInExpressie(expr.rechts, gevonden);
      return gevonden;
    case "PERCENTAGE_VAN":
      variabelenInExpressie(expr.basis, gevonden);
      variabelenInExpressie(expr.percentage, gevonden);
      return gevonden;
    case "EN":
    case "OF":
      expr.voorwaarden.forEach((v) => variabelenInExpressie(v, gevonden));
      return gevonden;
    case "NIET":
      variabelenInExpressie(expr.voorwaarde, gevonden);
      return gevonden;
    case "MINIMUM":
    case "MAXIMUM":
      expr.waarden.forEach((w) => variabelenInExpressie(w, gevonden));
      return gevonden;
    case "ALS_DAN":
      variabelenInExpressie(expr.voorwaarde, gevonden);
      variabelenInExpressie(expr.dan, gevonden);
      variabelenInExpressie(expr.anders, gevonden);
      return gevonden;
    case "BEVAT":
      variabelenInExpressie(expr.lijst, gevonden);
      variabelenInExpressie(expr.waarde, gevonden);
      return gevonden;
  }
}
