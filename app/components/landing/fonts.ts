import { Geist, Geist_Mono } from "next/font/google";

// Eén variabele grotesk voor koppen en tekst (Geist), Geist Mono voor maatlabels en
// getallen in tekeningen. Twee bestanden in plaats van drie. Zie docs/landing-design.md.
export const lpDisplay = Geist({
  subsets: ["latin"],
  variable: "--font-lp-display",
  display: "swap",
});

export const lpTekst = lpDisplay;

export const lpMaat = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-lp-maat",
  display: "swap",
  preload: false,
});

export const lpFontClasses = `${lpDisplay.variable} ${lpMaat.variable}`;
