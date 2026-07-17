// JSON-LD (schema.org) voor de homepage: Organization (het bedrijf achter
// Kostenplan) en SoftwareApplication (de tool zelf, met het Gratis-pakket
// als offer — geen sterrenbeoordeling/aantal reviews, want die data bestaat
// niet en verzinnen zou misleidende structured data opleveren).
export function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Kostenplan",
        alternateName: "GymWiki",
        url: "https://www.kostenplan.nl",
        logo: "https://www.kostenplan.nl/icon.png",
        email: "gymwiki25@gmail.com",
      },
      {
        "@type": "SoftwareApplication",
        name: "Kostenplan",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://www.kostenplan.nl",
        description:
          "Offertecalculator voor hoveniers en andere vakmensen: klanten berekenen zelf een prijsindicatie, aanvragen komen binnen in een leads-CRM.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "Gratis pakket met tot 10 diensten en producten",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
