import { put } from "@vercel/blob";
import { SNAPSHOT_SCHEMA_VERSIE, type RekentoolSnapshot } from "./types";

// Opslag van de gepubliceerde snapshots.
//  - Primair: Vercel Blob (publieke CDN, los van de database).
//  - Spiegel (niveau 2, optioneel): Cloudflare, via een kleine Worker.
// Alles is optioneel via omgevingsvariabelen: zonder token blijft de embed
// gewoon uit de database lezen (het gedrag van vóór de snapshots).

export const latestPad = (toolId: string) => `s/${toolId}/latest.json`;
export const versiePad = (toolId: string, versie: number) => `s/${toolId}/v${versie}.json`;

export function blobGeconfigureerd(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Publieke basis-URL van de Blob-store. Af te leiden uit het token
// (vercel_blob_rw_<storeId>_<geheim>), te overschrijven met SNAPSHOT_BASE_URL.
export function snapshotBasisUrl(): string | null {
  const expliciet = process.env.SNAPSHOT_BASE_URL;
  if (expliciet) return expliciet.replace(/\/$/, "");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = token?.split("_")[3];
  return storeId ? `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

export function spiegelBasisUrl(): string | null {
  const url = process.env.SNAPSHOT_MIRROR_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export function spiegelSchrijfConfig(): { url: string; token: string } | null {
  const url = process.env.CF_MIRROR_WRITE_URL;
  const token = process.env.CF_MIRROR_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function isGeldigSnapshot(waarde: unknown, toolId: string): waarde is RekentoolSnapshot {
  if (!waarde || typeof waarde !== "object") return false;
  const s = waarde as Partial<RekentoolSnapshot>;
  return (
    typeof s.schemaVersie === "number" &&
    s.schemaVersie <= SNAPSHOT_SCHEMA_VERSIE &&
    s.toolId === toolId &&
    typeof s.versie === "number" &&
    typeof s.beschikbaar === "boolean" &&
    Boolean(s.bedrijf) &&
    Boolean(s.costSettings)
  );
}

async function haalOp(url: string, toolId: string, timeoutMs: number): Promise<RekentoolSnapshot | null> {
  try {
    // Unieke query: de CDN-cache van "latest" (min. 60 s) mag een net
    // gepubliceerde wijziging niet vertragen; de pagina cachet zelf.
    const res = await fetch(`${url}?nc=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return isGeldigSnapshot(json, toolId) ? json : null;
  } catch {
    return null;
  }
}

export type SnapshotBron = "blob" | "spiegel";

// Leest de nieuwste snapshot: eerst Blob, dan de spiegel. Nooit een exception.
export async function leesSnapshot(
  toolId: string,
  timeoutMs = 2500
): Promise<{ snapshot: RekentoolSnapshot; bron: SnapshotBron } | null> {
  const blob = snapshotBasisUrl();
  if (blob) {
    const snapshot = await haalOp(`${blob}/${latestPad(toolId)}`, toolId, timeoutMs);
    if (snapshot) return { snapshot, bron: "blob" };
  }
  const spiegel = spiegelBasisUrl();
  if (spiegel) {
    const snapshot = await haalOp(`${spiegel}/${latestPad(toolId)}`, toolId, timeoutMs);
    if (snapshot) return { snapshot, bron: "spiegel" };
  }
  return null;
}

async function schrijfSpiegel(snapshot: RekentoolSnapshot, body: string): Promise<void> {
  const config = spiegelSchrijfConfig();
  if (!config) return;
  const res = await fetch(`${config.url}/mirror/${snapshot.toolId}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Spiegel gaf ${res.status}`);
}

// Schrijft eerst het onveranderlijke versiebestand, dan pas de "latest"-
// verwijzing: een lezer ziet dus nooit een latest die naar een niet-bestaand
// versiebestand wijst. Gooit bij een fout in de primaire opslag; de spiegel
// is aanvullend en mislukt los daarvan (zie `spiegelFout`).
export async function schrijfSnapshot(snapshot: RekentoolSnapshot): Promise<{ spiegelFout: string | null }> {
  const body = JSON.stringify(snapshot);
  const gedeeld = { access: "public" as const, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" };
  await put(versiePad(snapshot.toolId, snapshot.versie), body, { ...gedeeld, cacheControlMaxAge: 31536000 });
  await put(latestPad(snapshot.toolId), body, { ...gedeeld, cacheControlMaxAge: 60 });
  try {
    await schrijfSpiegel(snapshot, body);
    return { spiegelFout: null };
  } catch (e) {
    return { spiegelFout: e instanceof Error ? e.message : "Spiegel mislukt" };
  }
}
