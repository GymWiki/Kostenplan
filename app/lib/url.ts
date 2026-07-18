import "server-only";
import { headers } from "next/headers";

// Statische site-URL voor Metadata-exports (bijv. metadataBase in
// app/layout.tsx) — die worden op moduleniveau geëvalueerd, dus zonder
// request en dus zonder headers(), in tegenstelling tot getBaseUrl()
// hieronder. Volgorde: expliciete override (NEXT_PUBLIC_APP_URL) > Vercel's
// eigen productiedomein zodra Vercel de build als productie markeert (juist
// zonder dat iemand een env var hoeft te zetten of te onthouden bij een
// nieuwe deploy) > de URL van de huidige preview/dev-deployment > localhost
// voor lokale ontwikkeling zonder Vercel.
export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function getBaseUrl() {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function getPortalUrl(slug: string) {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/portaal/${slug}`;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function getEmbedCode(slug: string, bedrijfsnaam: string) {
  const baseUrl = await getBaseUrl();
  const portalUrl = `${baseUrl}/portaal/${slug}`;
  const iframeId = `kostenplan-${slug}`;
  const title = escapeHtmlAttribute(`Kostencalculator van ${bedrijfsnaam}`);

  return `<iframe
  id="${iframeId}"
  src="${portalUrl}"
  title="${title}"
  style="width: 100%; border: 0;"
  height="900"
  loading="lazy"
></iframe>
<script>
  (function () {
    window.addEventListener("message", function (event) {
      if (event.origin !== ${JSON.stringify(baseUrl)}) return;
      var data = event.data;
      if (!data || data.type !== "kostenplan:resize" || data.slug !== ${JSON.stringify(slug)}) return;
      var iframe = document.getElementById(${JSON.stringify(iframeId)});
      if (iframe) iframe.style.height = data.height + "px";
    });
  })();
</script>`;
}
