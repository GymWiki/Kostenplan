// Eenvoudige limiet per sleutel (bijv. "gast-start:<ip-hash>"). Met Upstash
// Redis (Vercel Marketplace → KV) als UPSTASH_REDIS_REST_URL en
// UPSTASH_REDIS_REST_TOKEN gezet zijn; anders in het geheugen van de
// serverless-instantie (werkt in dev en is een zachte rem, geen harde limiet).
const geheugen = new Map<string, { telling: number; tot: number }>();

export type LimietUitslag = { toegestaan: boolean; resterend: number };

export async function beperk(sleutel: string, max: number, vensterSeconden: number): Promise<LimietUitslag> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", sleutel],
          ["EXPIRE", sleutel, String(vensterSeconden), "NX"],
        ]),
        cache: "no-store",
      });
      if (res.ok) {
        const [incr] = (await res.json()) as { result: number }[];
        const telling = Number(incr?.result ?? 0);
        return { toegestaan: telling <= max, resterend: Math.max(0, max - telling) };
      }
    } catch {
      // Redis onbereikbaar: val terug op geheugen in plaats van iedereen te blokkeren.
    }
  }

  const nu = Date.now();
  const rij = geheugen.get(sleutel);
  if (!rij || rij.tot <= nu) {
    geheugen.set(sleutel, { telling: 1, tot: nu + vensterSeconden * 1000 });
    return { toegestaan: 1 <= max, resterend: max - 1 };
  }
  rij.telling += 1;
  return { toegestaan: rij.telling <= max, resterend: Math.max(0, max - rij.telling) };
}

export function resetGeheugenLimieten() {
  geheugen.clear();
}
