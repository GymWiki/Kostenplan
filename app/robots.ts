import type { MetadataRoute } from "next";

const BASE_URL = "https://kostenplan.nl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /dashboard en /api zijn nooit publiek (proxy.ts redirect onauthenticated
      // bezoekers al naar /login, maar dit bespaart crawlers de moeite en
      // voorkomt dat de redirect-keten zelf gecrawld wordt). /auth/confirm is
      // een Supabase-bevestigingslink uit e-mails, geen doorzoekbare content.
      disallow: ["/dashboard", "/api", "/auth"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
