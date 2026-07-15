import type { MetadataRoute } from "next";

// Hardcoded productie-domein — bewust niet NEXT_PUBLIC_APP_URL, want die
// staat in .env/lokale ontwikkeling op localhost en een sitemap moet altijd
// de echte, publieke URL bevatten ongeacht de omgeving waarin hij gebouwd
// wordt.
const BASE_URL = "https://kostenplan.nl";

// Alleen de statische marketingpagina's van de hoofdsite. Bewust NIET
// opgenomen:
// - /dashboard, /api, /auth: geen publieke content (zie ook robots.ts).
// - /login, /registreren: publieke, crawlbare pagina's zonder unieke
//   marketingwaarde — geen reden om ze actief te promoten voor indexering.
// - /portaal/[slug]: publieke, per-tenant klantenportalen met een
//   onbegrensde, dynamische set URL's. Een statische sitemap kan deze niet
//   zinvol opsommen; een dynamische sitemap die actieve tenant-slugs uit de
//   database leest zou een logische vervolgstap zijn als SEO voor tenant-
//   portalen gewenst is.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/prijzen`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/algemene-voorwaarden`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacybeleid`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
