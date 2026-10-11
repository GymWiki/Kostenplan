import "server-only";

// Meldt iets dat aandacht vraagt: altijd in de serverlogs, en — als
// ALERT_WEBHOOK_URL is ingesteld (Slack/Discord/Better Stack-compatibel,
// {"text": "..."} ) — ook als bericht. Faalt nooit.
export async function meldAlarm(bericht: string): Promise<void> {
  console.error(`[alarm] ${bericht}`);
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `Kostenplan: ${bericht}`, content: `Kostenplan: ${bericht}` }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // alarm kan zelf niet verstuurd worden; de log hierboven blijft
  }
}
