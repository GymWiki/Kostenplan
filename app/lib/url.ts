import "server-only";
import { headers } from "next/headers";
import { bouwEmbedCode, bouwIframeCode } from "@/app/lib/embed-code";
import { snapshotBasisUrl } from "@/app/lib/snapshot/opslag";

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

// Insluitcode voor één specifieke tool (zie Deel 26/28 van de opdracht) —
// laadt uitsluitend via /embed/[toolId], nooit via een company/bedrijfsslug,
// zodat de code van Tool A nooit per ongeluk Tool B van hetzelfde bedrijf
// kan tonen. De auto-resize (ResizeObserver + postMessage, al aanwezig in
// Calculator) blijft ongewijzigd — alleen de bron-URL en de resize-sleutel
// (toolId i.p.v. de oude company-slug) zijn nieuw.
export async function getToolEmbedCode(
  toolId: string,
  toolNaam: string,
  embedConfig: import("@/app/lib/tools").ToolEmbedConfig,
  contact: import("@/app/lib/embed-code").EmbedContact = { naam: toolNaam }
) {
  return bouwEmbedCode(await embedOpties(toolId, toolNaam, embedConfig, contact));
}

// Alternatief zonder laadscript (alleen een iframe met contactkaart als terugval).
export async function getToolIframeCode(
  toolId: string,
  toolNaam: string,
  embedConfig: import("@/app/lib/tools").ToolEmbedConfig,
  contact: import("@/app/lib/embed-code").EmbedContact = { naam: toolNaam }
) {
  return bouwIframeCode(await embedOpties(toolId, toolNaam, embedConfig, contact));
}

// De basis voor het bouwen van embedcode (ook in de editor, voor varianten per plek op de site).
export async function getEmbedOpties(
  toolId: string,
  toolNaam: string,
  embedConfig: import("@/app/lib/tools").ToolEmbedConfig,
  contact: import("@/app/lib/embed-code").EmbedContact
) {
  return embedOpties(toolId, toolNaam, embedConfig, contact);
}

async function embedOpties(
  toolId: string,
  toolNaam: string,
  embedConfig: import("@/app/lib/tools").ToolEmbedConfig,
  contact: import("@/app/lib/embed-code").EmbedContact
) {
  return {
    toolId,
    toolNaam,
    baseUrl: await getBaseUrl(),
    reserveUrl: process.env.NEXT_PUBLIC_EMBED_RESERVE_URL || null,
    snapshotUrl: snapshotBasisUrl(),
    embedConfig,
    contact,
  };
}
