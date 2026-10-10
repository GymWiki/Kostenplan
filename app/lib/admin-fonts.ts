import { Bricolage_Grotesque, Figtree } from "next/font/google";

// Lettertypes van het admin-thema (dashboard + onboarding); zie
// [data-admin-theme] in globals.css. Alleen daar geladen, niet op de
// marketingsite of in de klant-rekentool.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const adminFontClasses = `${figtree.variable} ${bricolage.variable}`;
