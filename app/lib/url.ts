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

// De canonieke publieke URL van één specifieke tool sinds Levering A
// (multi-tool) — zie /t/[bedrijfsslug]/[toolslug]/page.tsx.
export async function getToolUrl(bedrijfsSlug: string, toolSlug: string) {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/t/${bedrijfsSlug}/${toolSlug}`;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Insluitcode voor één specifieke tool (zie Deel 26/28 van de opdracht) —
// laadt uitsluitend via /embed/[toolId], nooit via een company/bedrijfsslug,
// zodat de code van Tool A nooit per ongeluk Tool B van hetzelfde bedrijf
// kan tonen. De auto-resize (ResizeObserver + postMessage, al aanwezig in
// Calculator) blijft ongewijzigd — alleen de bron-URL en de resize-sleutel
// (toolId i.p.v. de oude company-slug) zijn nieuw.
export async function getToolEmbedCode(
  toolId: string,
  toolNaam: string,
  embedConfig: import("@/app/lib/tools").ToolEmbedConfig
) {
  const baseUrl = await getBaseUrl();
  const embedUrl = `${baseUrl}/embed/${toolId}`;
  const iframeId = `kostenplan-${toolId}`;
  const title = escapeHtmlAttribute(`Rekentool ${toolNaam}`);

  const breedteStyle = embedConfig.breedte === "VAST" ? `${embedConfig.vasteBreedtePx}px` : "100%";
  const border = embedConfig.toonBorder ? "1px solid #e2e8f0" : "0";
  const style = [
    `width: ${breedteStyle}`,
    `min-height: ${embedConfig.minimaleHoogtePx}px`,
    `border: ${border}`,
    `border-radius: ${embedConfig.radiusPx}px`,
    embedConfig.transparanteAchtergrond ? "background: transparent" : null,
  ]
    .filter(Boolean)
    .join("; ");

  return `<iframe
  id="${iframeId}"
  src="${embedUrl}"
  title="${title}"
  style="${style};"
  height="${embedConfig.minimaleHoogtePx}"
  loading="lazy"
  allowtransparency="${embedConfig.transparanteAchtergrond ? "true" : "false"}"
></iframe>
<script>
  (function () {
    window.addEventListener("message", function (event) {
      if (event.origin !== ${JSON.stringify(baseUrl)}) return;
      var data = event.data;
      if (!data || data.type !== "kostenplan:resize" || data.toolId !== ${JSON.stringify(toolId)}) return;
      var iframe = document.getElementById(${JSON.stringify(iframeId)});
      if (iframe) iframe.style.height = Math.max(data.height, ${embedConfig.minimaleHoogtePx}) + "px";
    });
  })();
</script>`;
}
