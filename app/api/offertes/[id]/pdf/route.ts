import { NextResponse } from "next/server";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { maakOffertePdf } from "@/app/lib/offerte/pdf";
import { maakPrintToken } from "@/app/lib/offerte/pdf-token";
import { zorgVoorGetekendePdf } from "@/app/lib/offerte/publiek-acties";
import { bestandsnaam } from "@/app/lib/offerte/weergave";
import type { OfferteInhoud } from "@/app/lib/offerte/model";

export const runtime = "nodejs";
export const maxDuration = 60;

// PDF van een offerte voor de hovenier: een verstuurde versie komt exact zoals
// verstuurd uit de database; een concept wordt op dat moment gemaakt (voorbeeld).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireActiveCompany();
  const { id } = await params;
  const url = new URL(req.url);
  const o = await prismaBasis.offerteV2.findFirst({ where: { id, companyId: company.id }, select: { id: true, huidigeVersie: true } });
  if (!o) return new NextResponse("Niet gevonden", { status: 404 });
  const versieNr = Number(url.searchParams.get("versie")) || o.huidigeVersie;
  const v = await prismaBasis.offerteVersie.findFirst({ where: { offerteId: id, versie: versieNr } });
  if (!v) return new NextResponse("Niet gevonden", { status: 404 });
  const inhoud = v.inhoud as unknown as OfferteInhoud;
  const koppen = (b: Uint8Array | Buffer) => new NextResponse(new Uint8Array(b), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(bestandsnaam(inhoud))}`, "cache-control": "private, no-store" } });
  // Getekende PDF na akkoord (voor de hovenier, bij de lead).
  // Na akkoord is de getekende PDF (met de door de klant gekozen optionele regels) de geldende PDF; de oorspronkelijk
  // verstuurde versie blijft beschikbaar met ?verstuurd=1.
  const akkoord = await prismaBasis.offerteAkkoord.findFirst({ where: { offerteId: id, versieNummer: versieNr }, select: { id: true } });
  if (url.searchParams.get("getekend") || (akkoord && !url.searchParams.get("verstuurd"))) {
    const pdf = await zorgVoorGetekendePdf(id, url.origin).catch(() => null);
    return pdf ? koppen(pdf) : new NextResponse("Nog niet getekend", { status: 404 });
  }
  // Een klaargezette of verstuurde versie komt exact zoals hij is bewaard.
  if (v.pdfData) return koppen(v.pdfData);
  try {
    const pdf = await maakOffertePdf(`${url.origin}/offerte-print/${maakPrintToken({ k: "versie", o: id, v: versieNr, concept: true })}`, inhoud);
    return koppen(pdf);
  } catch (e) {
    console.error("[offerte] voorbeeld-PDF mislukt", e);
    return new NextResponse("De PDF kon niet worden gemaakt.", { status: 500 });
  }
}
