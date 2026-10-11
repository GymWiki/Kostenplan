import { NextResponse } from "next/server";
import { prismaBasis } from "@/app/lib/prisma";
import { blobGeconfigureerd } from "@/app/lib/snapshot/opslag";
import { publiceerTool } from "@/app/lib/snapshot/publiceer";

export const maxDuration = 60;

// Dagelijkse controle en inhaalslag (Vercel Cron, zie vercel.json):
//  - publiceert tools zonder snapshot of met een mislukte publicatie
//    (dit is ook de eenmalige backfill voor bestaande tools: roep hem
//    handmatig aan tot "resterend" 0 is);
//  - controleert of de Cloudflare-spiegel gelijk is aan de primaire opslag.
function geautoriseerd(request: Request): boolean {
  const geheim = process.env.CRON_SECRET;
  return Boolean(geheim) && request.headers.get("authorization") === `Bearer ${geheim}`;
}

export async function GET(request: Request) {
  if (!geautoriseerd(request)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!blobGeconfigureerd()) return NextResponse.json({ ok: true, overgeslagen: "opslag niet ingesteld" });

  const teDoen = await prismaBasis.tool.findMany({
    where: { deletedAt: null, OR: [{ snapshotVuil: true }, { snapshotVersie: 0 }] },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true },
  });
  let gelukt = 0;
  const fouten: string[] = [];
  for (const { id } of teDoen) {
    const uitslag = await publiceerTool(id);
    if (uitslag.ok) gelukt += 1;
    else fouten.push(`${id}: ${uitslag.fout}`);
  }
  const resterend = await prismaBasis.tool.count({
    where: { deletedAt: null, OR: [{ snapshotVuil: true }, { snapshotVersie: 0 }] },
  });

  const { controleerSpiegel } = await import("@/app/lib/snapshot/spiegel-controle");
  const spiegel = await controleerSpiegel();

  if (fouten.length > 0 || !spiegel.ok) {
    const { meldAlarm } = await import("@/app/lib/alarm");
    await meldAlarm(
      `Dagelijkse controle van de rekentool-kopieën: ${fouten.length} publicatiefout(en), ${spiegel.verschillen.length} verschil(len) met de reservekopie. ${[...fouten, ...spiegel.verschillen].slice(0, 5).join(" | ")}`
    );
  }
  return NextResponse.json({ ok: fouten.length === 0 && spiegel.ok, gelukt, resterend, fouten, spiegel });
}
