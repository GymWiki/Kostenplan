// Klikmetingen van de landingspagina. Er is in dit project geen analytics-
// aanbieder; dit stuurt een klein bericht naar /api/landing-event, dat het als
// één JSON-regel logt (zichtbaar in de Vercel-logs/log drains). Wil je later een
// aanbieder koppelen, dan hoeft alleen deze functie te veranderen.
export type KlikBron = "hero" | "afsluiter" | "prijzen" | "nav" | "werkzaamheden";
export type KlikActie = "cta" | "website-invoer" | "pakket-kiezen";

export function trackKlik(bron: KlikBron, actie: KlikActie, extra?: { pakket?: string; metSite?: boolean }) {
  try {
    const body = JSON.stringify({ bron, actie, ...extra });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/landing-event", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/landing-event", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* meten mag nooit iets breken */
  }
}
