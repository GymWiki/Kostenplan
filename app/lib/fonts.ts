import { Lora, Oswald, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import type { Lettertype } from "@/app/generated/prisma/client";

// One font per Lettertype option, each with its own CSS variable.
// preload: false is deliberate — a portal page only ever uses ONE of these
// four at a time (picked at render time via fontFamilyFor() below), so
// eagerly preloading all four would triple/quadruple the font payload for
// no benefit. Without preload, the browser only fetches the font file that's
// actually referenced by the applied font-family.
const modern = Plus_Jakarta_Sans({
  variable: "--font-modern",
  subsets: ["latin"],
  preload: false,
});
const klassiek = Lora({
  variable: "--font-klassiek",
  subsets: ["latin"],
  preload: false,
});
const vriendelijk = Poppins({
  variable: "--font-vriendelijk",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  preload: false,
});
const stoer = Oswald({
  variable: "--font-stoer",
  subsets: ["latin"],
  preload: false,
});

export const brandingFonts = [modern, klassiek, vriendelijk, stoer];

export const lettertypeOpties: { value: Lettertype; label: string }[] = [
  { value: "MODERN", label: "Modern (sans-serif)" },
  { value: "KLASSIEK", label: "Klassiek (serif)" },
  { value: "VRIENDELIJK", label: "Vriendelijk (rond)" },
  { value: "STOER", label: "Stoer (robuust)" },
];

const fontByLettertype: Record<Lettertype, { variable: string; fallback: string }> = {
  MODERN: { variable: "--font-modern", fallback: "sans-serif" },
  KLASSIEK: { variable: "--font-klassiek", fallback: "serif" },
  VRIENDELIJK: { variable: "--font-vriendelijk", fallback: "sans-serif" },
  STOER: { variable: "--font-stoer", fallback: "sans-serif" },
};

// An inline `fontFamily` value, e.g. for the portal root — see calculator.tsx.
export function fontFamilyFor(lettertype: Lettertype) {
  const { variable, fallback } = fontByLettertype[lettertype];
  return `var(${variable}), ${fallback}`;
}

// Registers all four CSS variables on an element (the portal root) so
// whichever one fontFamilyFor() references above can actually resolve.
export function brandingFontVariables() {
  return brandingFonts.map((f) => f.variable).join(" ");
}
