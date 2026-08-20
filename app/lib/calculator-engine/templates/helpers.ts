import { RUNNING_SUBTOTAL_VARIABLE, type Expression, type PriceRule, type PriceRuleCategory } from "../types";

// ---------------------------------------------------------------------------
// Kleine bouwstenen om de vijf templates hieronder leesbaar te houden — puur
// gemaksfuncties rond de Expression-/PriceRule-types uit types.ts, geen
// nieuwe engine-functionaliteit.
// ---------------------------------------------------------------------------

export const getal = (waarde: number): Expression => ({ kind: "GETAL", waarde });
export const variabele = (naam: string): Expression => ({ kind: "VARIABELE", naam });
export const delen = (links: Expression, rechts: Expression): Expression => ({ kind: "DELEN", links, rechts });
export const vermenigvuldigen = (...factoren: Expression[]): Expression => ({ kind: "VERMENIGVULDIGEN", factoren });
export const optellen = (...termen: Expression[]): Expression => ({ kind: "OPTELLEN", termen });

export const isGelijkAanTekst = (variabeleNaam: string, waarde: string): Expression => ({
  kind: "GELIJK_AAN",
  links: variabele(variabeleNaam),
  rechts: { kind: "TEKST", waarde },
});

export const isWaar = (variabeleNaam: string): Expression => ({
  kind: "GELIJK_AAN",
  links: variabele(variabeleNaam),
  rechts: { kind: "BOOLEAN", waarde: true },
});

type RegelBasis = {
  id: string;
  label: string;
  categorie: PriceRuleCategory;
  voorwaarde?: Expression;
  intern?: boolean;
  toonInUitsplitsing?: boolean;
};

function metStandaarden(basis: RegelBasis) {
  return {
    id: basis.id,
    label: basis.label,
    categorie: basis.categorie,
    voorwaarde: basis.voorwaarde,
    actief: true,
    intern: basis.intern ?? false,
    toonInUitsplitsing: basis.toonInUitsplitsing ?? true,
  };
}

export function vastRegel(basis: RegelBasis, bedrag: number): PriceRule {
  return { ...metStandaarden(basis), type: "VAST", bedrag: getal(bedrag) };
}

export function toeslagRegel(basis: RegelBasis, bedrag: number): PriceRule {
  return { ...metStandaarden(basis), type: "TOESLAG", bedrag: getal(bedrag) };
}

export function perEenheidRegel(
  basis: RegelBasis,
  hoeveelheid: Expression,
  prijsPerEenheid: Expression,
  eenheid: string
): PriceRule {
  return { ...metStandaarden(basis), type: "PER_EENHEID", hoeveelheid, prijsPerEenheid, eenheid };
}

export function percentageRegel(basis: RegelBasis, percentage: number): PriceRule {
  return {
    ...metStandaarden(basis),
    type: "PERCENTAGE",
    basis: variabele(RUNNING_SUBTOTAL_VARIABLE),
    percentage: getal(percentage),
  };
}
