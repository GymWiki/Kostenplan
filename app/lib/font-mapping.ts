// Losgetrokken van fonts.ts: dat bestand importeert next/font/google, wat
// alleen werkt binnen Next's eigen build-pipeline (SWC/webpack-loader) en
// vitest laat crashen zodra je het importeert. mapFontFamilyToLettertype()
// is pure logica zonder Next-afhankelijkheid, dus hoort hier zodat
// app/lib/branding-extract.ts (server-only) én de tests 'm los kunnen
// importeren zonder de font-loader-calls te triggeren.
import type { Lettertype } from "@/app/generated/prisma/client";

// Branding kent maar 4 vaste lettertype-opties (geen vrij te kiezen
// webfont), dus auto-branding (app/lib/branding-extract.ts) kan een van een
// site gescrapete fontnaam ("Poppins", "Playfair Display", ...) niet
// letterlijk toepassen — enkel de dichtstbijzijnde stijl-bucket kiezen.
// Bewust een kleine, expliciete keyword-lijst i.p.v. een "slimme" classifier
// — makkelijk uit te breiden, en een verkeerde gok hier is nooit erger dan
// de MODERN-default die toch al de meest neutrale keuze is.
const KLASSIEK_KEYWORDS = [
  "serif",
  "playfair",
  "merriweather",
  "georgia",
  "times",
  "garamond",
  "cormorant",
  "libre baskerville",
  "pt serif",
  "crimson",
];
const VRIENDELIJK_KEYWORDS = [
  "poppins",
  "nunito",
  "quicksand",
  "comfortaa",
  "baloo",
  "fredoka",
  "varela round",
  "rubik",
];
const STOER_KEYWORDS = [
  "oswald",
  "bebas",
  "anton",
  "archivo black",
  "teko",
  "rajdhani",
  "condensed",
  "impact",
];

export function mapFontFamilyToLettertype(fontFamily: string): Lettertype {
  const naam = fontFamily.toLowerCase();
  if (KLASSIEK_KEYWORDS.some((kw) => naam.includes(kw))) return "KLASSIEK";
  if (VRIENDELIJK_KEYWORDS.some((kw) => naam.includes(kw))) return "VRIENDELIJK";
  if (STOER_KEYWORDS.some((kw) => naam.includes(kw))) return "STOER";
  return "MODERN";
}
