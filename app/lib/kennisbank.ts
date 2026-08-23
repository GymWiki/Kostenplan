// Registry van kennisbank-artikelen onder /kennisbank/[slug]. Eén centrale
// lijst zodat de index-pagina, de sitemap en interne links nooit uit sync
// raken met de daadwerkelijke artikelpagina's (elk artikel is een eigen
// page.tsx met volledig eigen inhoud — zie app/kennisbank/[slug]/).
export type KennisbankArtikel = {
  slug: string;
  titel: string;
  samenvatting: string;
  datum: string; // ISO-datum, gebruikt voor lastModified in sitemap.ts
};

export const KENNISBANK_ARTIKELEN: KennisbankArtikel[] = [
  {
    slug: "rekentool-op-eigen-website-zetten",
    titel: "Hoe zet je een rekentool op je eigen website?",
    samenvatting:
      "Stap voor stap: van het bouwen van je rekentool tot het plaatsen ervan op je eigen website, met of zonder ontwikkelaar.",
    datum: "2026-08-23",
  },
  {
    slug: "hoe-werkt-een-offerte-calculator",
    titel: "Hoe werkt een offerte calculator?",
    samenvatting:
      "Wat er technisch en praktisch gebeurt tussen het invullen van een berekening en het binnenkomen van een offerteaanvraag.",
    datum: "2026-08-23",
  },
  {
    slug: "gegevens-voor-een-tuinaanleg-calculator",
    titel: "Welke gegevens heb je nodig voor een tuinaanleg-calculator?",
    samenvatting:
      "Een overzicht van de tarieven, materialen en vragen die je vooraf moet verzamelen om een tuinaanleg-rekentool te bouwen.",
    datum: "2026-08-23",
  },
];

export function getKennisbankArtikel(slug: string): KennisbankArtikel | undefined {
  return KENNISBANK_ARTIKELEN.find((a) => a.slug === slug);
}
