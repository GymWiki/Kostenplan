import type { Expression } from "@/app/lib/calculator-engine";
import type { BeschikbareVariabele } from "./variabelen-utils";

// ---------------------------------------------------------------------------
// Pure logica achter de gedeelde conditie-builder (Deel 5/8 van de opdracht:
// "ALS x=y", AND/OR ondersteund) — bewust gescheiden van voorwaarde-editor.tsx
// (het "use client"-UI-component) zodat deze functies zonder React/DOM
// getest kunnen worden, zie voorwaarde.test.ts.
//
// Bouwt een PLATTE lijst condities + ÉÉN combinator (EN/OF) — geen geneste
// boomstructuur: dat is precies wat een niet-technische vakman nodig heeft
// voor de voorbeelden uit de opdracht ("ALS poort=ja EN bereikbaarheid=
// slecht"), en blijft leesbaar. Complexere, geneste boolean-logica blijft
// mogelijk via een FORMULE-prijsregel (zie types.ts) voor power users.
// ---------------------------------------------------------------------------

export const COMPARATOR_LABELS: Record<string, string> = {
  GELIJK_AAN: "is gelijk aan",
  NIET_GELIJK_AAN: "is niet gelijk aan",
  GROTER_DAN: "is meer dan",
  KLEINER_DAN: "is minder dan",
  GROTER_OF_GELIJK: "is meer dan of gelijk aan",
  KLEINER_OF_GELIJK: "is minder dan of gelijk aan",
};

export type Operator = keyof typeof COMPARATOR_LABELS | "BEVAT";

export type VoorwaardeConditie = { variabele: string; operator: Operator; waarde: string };
export type VoorwaardeGroep = { combinator: "EN" | "OF"; condities: VoorwaardeConditie[] };

export function legeConditie(variabelen: BeschikbareVariabele[]): VoorwaardeConditie {
  const eerste = variabelen[0];
  return { variabele: eerste?.naam ?? "", operator: eerste?.type === "OPTIONS" ? "BEVAT" : "GELIJK_AAN", waarde: "" };
}

// Eén simpele expressie (comparator of BEVAT) -> VoorwaardeConditie, of null
// als het geen door deze editor bouwbare vorm is.
function ontleedConditie(expr: Expression): VoorwaardeConditie | null {
  if (expr.kind === "BEVAT") {
    if (expr.lijst.kind !== "VARIABELE" || expr.waarde.kind !== "TEKST") return null;
    return { variabele: expr.lijst.naam, operator: "BEVAT", waarde: expr.waarde.waarde };
  }
  if (!(expr.kind in COMPARATOR_LABELS)) return null;
  const e = expr as Extract<Expression, { links: Expression; rechts: Expression }>;
  if (e.links.kind !== "VARIABELE") return null;
  const rechts = e.rechts;
  const waarde = rechts.kind === "GETAL" ? String(rechts.waarde) : rechts.kind === "TEKST" ? rechts.waarde : rechts.kind === "BOOLEAN" ? String(rechts.waarde) : "";
  return { variabele: e.links.naam, operator: expr.kind as VoorwaardeConditie["operator"], waarde };
}

// Volledige Expression (mogelijk EN/OF van meerdere condities, mogelijk één
// kale comparator) -> VoorwaardeGroep, of null als niet bouwbaar met deze
// editor (bijv. een handmatig geschreven, geneste FORMULE-expressie) — in
// dat geval toont de aanroeper "geen voorwaarde" i.p.v. de bestaande,
// complexere expressie kapot te maken.
export function ontleedVoorwaarde(expr: Expression | undefined): VoorwaardeGroep | null {
  if (!expr) return null;
  if (expr.kind === "EN" || expr.kind === "OF") {
    const condities = expr.voorwaarden.map(ontleedConditie);
    if (condities.some((c) => c == null) || condities.length === 0) return null;
    return { combinator: expr.kind, condities: condities as VoorwaardeConditie[] };
  }
  const enkele = ontleedConditie(expr);
  if (!enkele) return null;
  return { combinator: "EN", condities: [enkele] };
}

function bouwConditie(c: VoorwaardeConditie, type: "NUMBER" | "OPTION" | "OPTIONS" | "BOOLEAN"): Expression {
  if (c.operator === "BEVAT") {
    return { kind: "BEVAT", lijst: { kind: "VARIABELE", naam: c.variabele }, waarde: { kind: "TEKST", waarde: c.waarde } };
  }
  const rechts: Expression =
    type === "NUMBER"
      ? { kind: "GETAL", waarde: Number(c.waarde) || 0 }
      : type === "BOOLEAN"
        ? { kind: "BOOLEAN", waarde: c.waarde === "waar" }
        : { kind: "TEKST", waarde: c.waarde };
  return { kind: c.operator, links: { kind: "VARIABELE", naam: c.variabele }, rechts } as Expression;
}

export function typeVoorVariabele(variabelen: BeschikbareVariabele[], naam: string): "NUMBER" | "OPTION" | "OPTIONS" | "BOOLEAN" {
  const v = variabelen.find((v) => v.naam === naam);
  if (v?.type === "NUMBER") return "NUMBER";
  if (v?.type === "BOOLEAN") return "BOOLEAN";
  if (v?.type === "OPTIONS") return "OPTIONS";
  return "OPTION";
}

// VoorwaardeGroep -> Expression, of undefined als de groep leeg/ongeldig is
// (bijv. nog geen variabele gekozen) — de aanroeper slaat dan simpelweg geen
// voorwaarde op.
export function bouwVoorwaarde(groep: VoorwaardeGroep, variabelen: BeschikbareVariabele[]): Expression | undefined {
  const geldig = groep.condities.filter((c) => c.variabele);
  if (geldig.length === 0) return undefined;
  const expressies = geldig.map((c) => bouwConditie(c, typeVoorVariabele(variabelen, c.variabele)));
  if (expressies.length === 1) return expressies[0];
  return { kind: groep.combinator, voorwaarden: expressies };
}
