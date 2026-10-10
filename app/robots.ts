import type { MetadataRoute } from "next";

const BASE_URL = "https://www.kostenplan.nl";

// AI-crawlers mogen de publieke pagina's expliciet lezen, zodat Kostenplan in
// antwoorden van ChatGPT, Perplexity, Gemini, Claude en Google AI Overviews
// geciteerd kan worden. Dezelfde uitsluitingen als voor alle andere bots.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended"];

// /dashboard en /api zijn nooit publiek (proxy.ts redirect onauthenticated
// bezoekers al naar /login, maar dit bespaart crawlers de moeite). /auth/callback
// is de OAuth-redirect van Google. /demo en /voorbeeld zijn iframe-bronnen voor
// de landingspagina en de editor, geen doorzoekbare content.
const DISALLOW = ["/dashboard", "/api", "/auth", "/demo", "/voorbeeld"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: ["/", "/llms.txt"], disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
