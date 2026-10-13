import { NextResponse } from "next/server";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { bestandsnaam } from "@/app/lib/offerte/weergave";
import { maakFactuurPdf, zorgVoorFactuurPdf } from "@/app/lib/factuur/pdf";
import type { FactuurInhoud } from "@/app/lib/factuur/model";

export const runtime = "nodejs";
export const maxDuration = 60;

// PDF van een factuur voor de hovenier: een definitieve factuur komt exact zoals vastgelegd uit de database;
// een concept krijgt op dat moment een voorbeeld-PDF (met "Concept"-watermerk).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireActiveCompany();
  const { id } = await params;
  const f = await prismaBasis.factuur.findFirst({ where: { id, companyId: company.id }, select: { id: true, status: true, inhoud: true } });
  if (!f) return new NextResponse("Niet gevonden", { status: 404 });
  const inhoud = f.inhoud as unknown as FactuurInhoud;
  const antwoord = (b: Uint8Array | Buffer) => new NextResponse(new Uint8Array(b), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(bestandsnaam(inhoud))}`, "cache-control": "private, no-store" } });
  try {
    if (f.status === "CONCEPT") return antwoord(await maakFactuurPdf(new URL(req.url).origin, f.id, inhoud));
    const r = await zorgVoorFactuurPdf(new URL(req.url).origin, f.id, company.id);
    return r ? antwoord(r.pdf) : new NextResponse("Niet gevonden", { status: 404 });
  } catch (e) {
    console.error("[factuur] PDF mislukt", e);
    return new NextResponse("De PDF kon niet worden gemaakt.", { status: 500 });
  }
}
