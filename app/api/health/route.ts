import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { prismaBasis } from "@/app/lib/prisma";
import { blobGeconfigureerd, snapshotBasisUrl } from "@/app/lib/snapshot/opslag";
import { mailGeconfigureerd } from "@/app/lib/mail/lead-mail";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Openbare gezondheidscontrole voor monitoring (UptimeRobot, Better Stack…).
//   /api/health               alles samen (200 = alles gezond, 503 = iets stuk)
//   /api/health?check=db      alleen de database
//   /api/health?check=opslag  alleen de opslag van de rekentool-kopieën
//   /api/health?check=mail    alleen de maildienst
// Geeft bewust alleen "ok" / "fout" / "niet ingesteld" terug: geen foutteksten,
// adressen of andere details.
type Stand = "ok" | "fout" | "niet ingesteld";

const metTijdslimiet = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("tijdslimiet")), ms))]);

async function checkDb(): Promise<Stand> {
  try {
    await metTijdslimiet(prismaBasis.$queryRaw`SELECT 1`, 4000);
    return "ok";
  } catch {
    return "fout";
  }
}

async function checkOpslag(): Promise<Stand> {
  if (!blobGeconfigureerd()) return "niet ingesteld";
  try {
    // 1) de opslag-API zelf, 2) de publieke CDN waar de embed uit leest.
    const { blobs } = await metTijdslimiet(list({ prefix: "s/", limit: 1 }), 4000);
    const basis = snapshotBasisUrl();
    if (blobs[0] && basis) {
      const res = await fetch(`${basis}/${blobs[0].pathname}?nc=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return "fout";
    }
    return "ok";
  } catch {
    return "fout";
  }
}

async function checkMail(): Promise<Stand> {
  if (!mailGeconfigureerd()) return "niet ingesteld";
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": process.env.BREVO_API_KEY!, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? "ok" : "fout";
  } catch {
    return "fout";
  }
}

export async function GET(request: Request) {
  const check = new URL(request.url).searchParams.get("check");
  const headers = { "cache-control": "no-store" };
  const kies = { db: checkDb, opslag: checkOpslag, mail: checkMail } as const;

  if (check) {
    if (!(check in kies)) return NextResponse.json({ ok: false }, { status: 400, headers });
    const stand = await kies[check as keyof typeof kies]();
    return NextResponse.json({ [check]: stand, ok: stand !== "fout" }, { status: stand === "fout" ? 503 : 200, headers });
  }

  const [db, opslag, mail] = await Promise.all([checkDb(), checkOpslag(), checkMail()]);
  const ok = db !== "fout" && opslag !== "fout" && mail !== "fout";
  return NextResponse.json({ ok, db, opslag, mail }, { status: ok ? 200 : 503, headers });
}
