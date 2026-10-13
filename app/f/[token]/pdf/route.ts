import { NextResponse } from "next/server";
import { prismaBasis } from "@/app/lib/prisma";
import { bestandsnaam } from "@/app/lib/offerte/weergave";
import { zorgVoorFactuurPdf } from "@/app/lib/factuur/pdf";
import type { FactuurInhoud } from "@/app/lib/factuur/model";

export const runtime = "nodejs";
export const maxDuration = 60;

// PDF voor de klant: de definitieve factuur exact zoals vastgelegd.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new NextResponse("Niet gevonden", { status: 404 });
  const f = await prismaBasis.factuur.findUnique({ where: { token }, select: { id: true, status: true, inhoud: true } });
  if (!f || f.status === "CONCEPT") return new NextResponse("Niet gevonden", { status: 404 });
  const r = await zorgVoorFactuurPdf(new URL(req.url).origin, f.id).catch(() => null);
  if (!r) return new NextResponse("De PDF is nog niet klaar.", { status: 503 });
  return new NextResponse(new Uint8Array(r.pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(bestandsnaam(f.inhoud as unknown as FactuurInhoud))}`, "cache-control": "private, no-store" } });
}
