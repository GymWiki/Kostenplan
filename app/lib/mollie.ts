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
