import { Archivo_Black, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Display: Archivo Black, brede bouwkundige grotesk (past bij werktekeningen, één klein bestand). Tekst: degelijke
// Plex Sans. Maatlabels: Plex Mono, één gewicht. Zie docs/landing-design.md.
export const lpDisplay = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-lp-display",
  display: "swap",
});

export const lpTekst = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-lp-tekst",
  display: "swap",
});

export const lpMaat = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-lp-maat",
  display: "swap",
  preload: false,
});

export const lpFontClasses = `${lpDisplay.variable} ${lpTekst.variable} ${lpMaat.variable}`;
