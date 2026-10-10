import { createHmac, timingSafeEqual } from "node:crypto";

// Korte, ondertekende bewijsstukken (httpOnly cookie) voor de gast-flow:
// bijvoorbeeld "deze browser had gast X" voor het overzetten van een voorbeeld
// naar een bestaand account. Geen JWT-bibliotheek nodig.
function geheim(): string {
  const g = process.env.GAST_TOKEN_SECRET;
  if (!g) throw new Error("GAST_TOKEN_SECRET ontbreekt.");
  return g;
}

export type GastBewijs = { gastUserId: string; companyId: string; verlooptOp: number };

export function maakGastBewijs(data: { gastUserId: string; companyId: string }, geldigMs = 60 * 60 * 1000, nu = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...data, verlooptOp: nu + geldigMs })).toString("base64url");
  const sig = createHmac("sha256", geheim()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function controleerGastBewijs(token: string | undefined, nu = Date.now()): GastBewijs | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const verwacht = createHmac("sha256", geheim()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(verwacht);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as GastBewijs;
    if (typeof d.gastUserId !== "string" || typeof d.companyId !== "string" || typeof d.verlooptOp !== "number") return null;
    return d.verlooptOp > nu ? d : null;
  } catch {
    return null;
  }
}
