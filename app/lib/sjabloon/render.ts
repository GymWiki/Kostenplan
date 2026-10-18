import { variabeleVoorKey, type SjabloonContext } from "./variabelen";

// Eén plek die {variabelen} in een tekst invult. Opslag is een gewone tekst met {key}-aanduidingen; in de editor zijn het blokjes, maar
// serialiseren geeft altijd weer {key}.

export const TOKEN = /\{(\w+)\}/g;

export type Deel = { soort: "tekst"; tekst: string } | { soort: "variabele"; key: string };

// Knipt een tekst in stukken tekst en variabelen. Alleen {woord} is een variabele; andere accolades blijven gewone tekst.
export function parseSjabloon(tekst: string): Deel[] {
  const delen: Deel[] = [];
  let laatste = 0;
  for (const m of tekst.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > laatste) delen.push({ soort: "tekst", tekst: tekst.slice(laatste, start) });
    delen.push({ soort: "variabele", key: m[1]! });
    laatste = start + m[0].length;
  }
  if (laatste < tekst.length) delen.push({ soort: "tekst", tekst: tekst.slice(laatste) });
  return delen;
}

export const serialiseerSjabloon = (delen: Deel[]): string => delen.map((d) => (d.soort === "tekst" ? d.tekst : `{${d.key}}`)).join("");

// Alle variabelen in een tekst, in volgorde van voorkomen (met dubbelen).
export const tokensIn = (tekst: string): string[] => [...tekst.matchAll(TOKEN)].map((m) => m[1]!);

export type SjabloonWaarden = Record<string, string | number | null | undefined>;

// Vult alle {variabelen} in. De waarden zijn platte tekst: ze worden nooit als HTML (of als nieuwe {variabele}) uitgelegd, ook niet als
// ze tekens als & of < bevatten, of zelf een {aanduiding}. Een ontbrekende of onbekende variabele wordt een lege waarde, nooit "undefined".
export function renderTemplate(template: string, waarden: SjabloonWaarden): string {
  return template.replace(TOKEN, (_m, key: string) => {
    const w = Object.hasOwn(waarden, key) ? waarden[key] : undefined;
    return w === undefined || w === null ? "" : String(w);
  });
}

// Welke variabelen uit de tekst kent deze context niet? (verouderde of verkeerd gespelde namen; ze blijven gewoon in de tekst staan)
export function onbekendeTokens(tekst: string, context: SjabloonContext): string[] {
  return [...new Set(tokensIn(tekst))].filter((k) => !variabeleVoorKey(k)?.contexten.includes(context));
}

// Variabelen die in deze context bij voorkeur in de tekst horen maar ontbreken (alleen een waarschuwing, nooit blokkerend).
export function ontbrekendeVerplichte(tekst: string, context: SjabloonContext, verplicht: { key: string; waarschuwing: string }[]): string[] {
  const aanwezig = new Set(tokensIn(tekst));
  return verplicht.filter((v) => !aanwezig.has(v.key)).map((v) => v.waarschuwing);
}

// ---- Bewerken van de tekst op een plek (de editor rekent in tekenposities van de opgeslagen tekst) -----------------------------------

const token = (key: string) => `{${key}}`;

export function voegVariabeleIn(tekst: string, positie: number, key: string): { tekst: string; cursor: number } {
  const p = Math.max(0, Math.min(positie, tekst.length));
  return { tekst: tekst.slice(0, p) + token(key) + tekst.slice(p), cursor: p + token(key).length };
}

// De variabele die op `positie` begint (positie van de accolade), of null.
export function variabeleOp(tekst: string, positie: number): { key: string; lengte: number } | null {
  const m = /^\{(\w+)\}/.exec(tekst.slice(positie));
  return m ? { key: m[1]!, lengte: m[0].length } : null;
}

export function verwijderVariabeleOp(tekst: string, positie: number): { tekst: string; cursor: number } {
  const v = variabeleOp(tekst, positie);
  if (!v) return { tekst, cursor: positie };
  return { tekst: tekst.slice(0, positie) + tekst.slice(positie + v.lengte), cursor: positie };
}

// Verplaatst de variabele op `van` naar `naar` (een positie in de tekst vóór het verplaatsen).
export function verplaatsVariabele(tekst: string, van: number, naar: number): { tekst: string; cursor: number } {
  const v = variabeleOp(tekst, van);
  if (!v) return { tekst, cursor: naar };
  // Neerzetten binnen of direct rond zichzelf: niets te doen.
  if (naar >= van && naar <= van + v.lengte) return { tekst, cursor: van + v.lengte };
  const zonder = tekst.slice(0, van) + tekst.slice(van + v.lengte);
  const doel = naar > van ? naar - v.lengte : naar;
  return voegVariabeleIn(zonder, doel, v.key);
}
