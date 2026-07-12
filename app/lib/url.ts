import "server-only";
import { headers } from "next/headers";

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
