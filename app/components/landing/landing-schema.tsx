import { BEDRIJF, DEFINITIE, PAKKETTEN, SITE_URL, VRAGEN, LAATST_BIJGEWERKT } from "@/app/lib/landing/feiten";

// JSON-LD voor de landingspagina: Organization, WebSite, SoftwareApplication
// (met de echte prijzen in EUR) en FAQPage (dezelfde tekst als in de pagina).
// TODO(Pieter): sameAs toevoegen zodra er bedrijfsprofielen zijn (LinkedIn e.d.);
// die staan nu nergens in de code en worden dus niet verzonnen.
export function LandingSchema() {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organisatie`,
      name: BEDRIJF.handelsnaam,
      legalName: BEDRIJF.naam,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      email: BEDRIJF.email,
      description: DEFINITIE,
      taxID: BEDRIJF.btw,
      identifier: { "@type": "PropertyValue", propertyID: "KvK-nummer", value: BEDRIJF.kvk },
      address: { "@type": "PostalAddress", addressLocality: BEDRIJF.plaats, addressCountry: BEDRIJF.land },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Kostenplan",
      inLanguage: "nl-NL",
      publisher: { "@id": `${SITE_URL}/#organisatie` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Kostenplan",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "nl-NL",
      url: SITE_URL,
      description: DEFINITIE,
      dateModified: LAATST_BIJGEWERKT.iso,
      publisher: { "@id": `${SITE_URL}/#organisatie` },
      offers: PAKKETTEN.flatMap((p) =>
        p.maand === 0
          ? [{ "@type": "Offer", name: p.naam, price: "0", priceCurrency: "EUR", url: `${SITE_URL}/probeer` }]
          : [
              { "@type": "Offer", name: `${p.naam} per maand`, price: String(p.maand), priceCurrency: "EUR", url: `${SITE_URL}/prijzen` },
              { "@type": "Offer", name: `${p.naam} per jaar`, price: String(p.jaar), priceCurrency: "EUR", url: `${SITE_URL}/prijzen` },
            ]
      ),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#vragen`,
      mainEntity: VRAGEN.map((v) => ({
        "@type": "Question",
        name: v.vraag,
        acceptedAnswer: { "@type": "Answer", text: v.antwoord },
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }} />;
}
