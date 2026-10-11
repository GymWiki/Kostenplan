import { NextResponse } from "next/server";
import { haalReserveLeadsOp } from "@/app/lib/reserve-ingest";

export const maxDuration = 60;

// Haalt aanvragen op uit de Cloudflare-reserve. Beschermd met CRON_SECRET.
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || request.headers.get("authorization") !== `Bearer ${geheim}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const uitslag = await haalReserveLeadsOp();
  return NextResponse.json({ ok: uitslag.fouten.length === 0, ...uitslag });
}
