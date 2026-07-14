import "server-only";
import createMollieClient from "@mollie/api-client";

type MollieClient = ReturnType<typeof createMollieClient>;

let client: MollieClient | null = null;

// Lazily initialized so pages that don't touch billing still work before
// MOLLIE_API_KEY is configured (it's set later, directly in Vercel).
export function getMollieClient(): MollieClient {
  if (client) return client;

  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MOLLIE_API_KEY ontbreekt. Zet deze omgevingsvariabele (Vercel of .env) voordat er " +
        "afgerekend kan worden."
    );
  }

  client = createMollieClient({ apiKey });
  return client;
}

// Vaste, publieke callback-URL die Mollie gebruikt om betaal-/abonnement-
// statussen door te geven (POST naar /api/mollie/webhook — zie die route
// voor de verwerking). Zet deze in Vercel op de productie-URL, bijv.
// https://kostenplan.nl/api/mollie/webhook — dit moet een STABIELE URL zijn
// die Mollie altijd kan bereiken, niet iets dat per verzoek/preview-
// deployment verschilt (in tegenstelling tot redirectUrl, die wél per
// verzoek van de ingelogde gebruiker mag worden afgeleid).
export function getMollieWebhookUrl(fallbackBaseUrl?: string): string {
  const configured = process.env.MOLLIE_WEBHOOK_URL;
  if (configured) return configured;

  if (fallbackBaseUrl) {
    console.warn(
      "MOLLIE_WEBHOOK_URL ontbreekt — val terug op " +
        `${fallbackBaseUrl}/api/mollie/webhook. Zet deze omgevingsvariabele in Vercel op de ` +
        "vaste productie-URL zodra die bekend is, zodat Mollie-webhooks niet afhankelijk zijn " +
        "van de host van het verzoek waarmee toevallig werd afgerekend."
    );
    return `${fallbackBaseUrl}/api/mollie/webhook`;
  }

  throw new Error(
    "MOLLIE_WEBHOOK_URL ontbreekt en er is geen fallback-URL beschikbaar. Zet deze " +
      "omgevingsvariabele (Vercel of .env) op bijv. https://kostenplan.nl/api/mollie/webhook."
  );
}
