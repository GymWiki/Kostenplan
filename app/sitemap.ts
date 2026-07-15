import type { MetadataRoute } from "next";
import { prisma } from "@/app/lib/prisma";

// Hardcoded productie-domein — bewust niet NEXT_PUBLIC_APP_URL, want die
// staat in .env/lokale ontwikkeling op localhost en een sitemap moet altijd
// de echte, publieke URL bevatten ongeacht de omgeving waarin hij gebouwd
// wordt.
const BASE_URL = "https://kostenplan.nl";

// Zonder revalidate zou Next.js dit bestand bij build time statisch
// genereren — nieuwe tenant-portalen zouden dan pas na de eerstvolgende
// deploy in de sitemap verschijnen. Elke 24 uur opnieuw genereren houdt
// hem actueel zonder dat elke crawl-hit de database raakt.
export const revalidate = 86400;

// Bewust NIET opgenomen:
// - /dashboard, /api, /auth: geen publieke content (zie ook robots.ts).
// - /login, /registreren: publieke, crawlbare pagina's zonder unieke
//   marketingwaarde — geen reden om ze actief te promoten voor indexering.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/prijzen`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${BASE_URL}/algemene-voorwaarden`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${BASE_URL}/privacybeleid`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Publieke klantenportalen: alleen bedrijven met minstens één actieve
  // dienst of product — een leeg portaal is dunne content en voegt niets
  // toe aan de sitemap. slug is uniek en publiek (bepaalt de portaal-URL),
  // dus geen andere Company-velden nodig.
  const companies = await prisma.company.findMany({
    where: {
      OR: [{ services: { some: { actief: true } } }, { products: { some: { actief: true } } }],
    },
    select: { slug: true, updatedAt: true },
  });

  const portalPages: MetadataRoute.Sitemap = companies.map((company) => ({
    url: `${BASE_URL}/portaal/${company.slug}`,
    lastModified: company.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...portalPages];
}
