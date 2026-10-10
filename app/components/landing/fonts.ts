import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Display: brede, bouwkundige grotesk (past bij werktekeningen). Tekst: degelijke
// Plex Sans. Maatlabels: Plex Mono, één gewicht. Zie docs/landing-design.md.
export const lpDisplay = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
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
});

export const lpFontClasses = `${lpDisplay.variable} ${lpTekst.variable} ${lpMaat.variable}`;
