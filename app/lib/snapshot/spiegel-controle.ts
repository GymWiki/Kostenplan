import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { latestPad, snapshotBasisUrl, spiegelBasisUrl } from "./opslag";

export type SpiegelControle = { ok: boolean; gecontroleerd: number; verschillen: string[]; overgeslagen?: string };

async function inhoudHash(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${url}?nc=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { inhoudHash?: unknown };
    return typeof json.inhoudHash === "string" ? json.inhoudHash : null;
  } catch {
    return null;
  }
}

// Vergelijkt per gepubliceerde tool de hash in de primaire opslag met die in
// de Cloudflare-spiegel. Zonder spiegel ingesteld: overgeslagen (niet fout).
export async function controleerSpiegel(): Promise<SpiegelControle> {
  const spiegel = spiegelBasisUrl();
  const primair = snapshotBasisUrl();
  if (!spiegel || !primair) return { ok: true, gecontroleerd: 0, verschillen: [], overgeslagen: "geen spiegel ingesteld" };

  const tools = await prismaBasis.tool.findMany({
    where: { deletedAt: null, status: "GEPUBLICEERD", snapshotVersie: { gt: 0 } },
    select: { id: true },
    take: 500,
  });
  const verschillen: string[] = [];
  for (const { id } of tools) {
    const [a, b] = await Promise.all([
      inhoudHash(`${primair}/${latestPad(id)}`),
      inhoudHash(`${spiegel}/${latestPad(id)}`),
    ]);
    if (!a || a !== b) verschillen.push(`${id}: primair=${a ?? "ontbreekt"} spiegel=${b ?? "ontbreekt"}`);
  }
  return { ok: verschillen.length === 0, gecontroleerd: tools.length, verschillen };
}
