import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Kortlevende, ondertekende token waarmee de headless browser de printpagina
// (/offerte-print/[token]) van één offerte mag openen. De token bevat alleen
// wát getoond wordt, niet de inhoud; die komt uit de database.
export type PrintPayload =
  | { k: "versie"; o: string; v: number; akkoord?: boolean; concept?: boolean; exp: number }
  | { k: "voorbeeld"; n: string; akkoord?: boolean; optioneel?: boolean; exp: number }
  | { k: "factuur"; f: string; exp: number };

const sleutel = () => createHmac("sha256", "offerte-print-v1").update(process.env.OFFERTE_PDF_SECRET ?? process.env.DATABASE_URL ?? "lokaal").digest();
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

type ZonderExp<T> = T extends unknown ? Omit<T, "exp"> : never;
export function maakPrintToken(p: ZonderExp<PrintPayload>, ttlSec = 180): string {
  const body = b64(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  return `${body}.${createHmac("sha256", sleutel()).update(body).digest("base64url")}`;
}

export function leesPrintToken(token: string): PrintPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const verwacht = createHmac("sha256", sleutel()).update(body).digest();
  let gegeven: Buffer;
  try {
    gegeven = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (gegeven.length !== verwacht.length || !timingSafeEqual(gegeven, verwacht)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PrintPayload;
    return p.exp > Math.floor(Date.now() / 1000) ? p : null;
  } catch {
    return null;
  }
}
