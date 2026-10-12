import { NextResponse } from "next/server";
import { maakOffertePdf } from "@/app/lib/offerte/pdf";
import { maakPrintToken } from "@/app/lib/offerte/pdf-token";
import { VOORBEELDEN } from "@/app/lib/offerte/voorbeelden";
import { bestandsnaam } from "@/app/lib/offerte/weergave";

export const runtime = "nodejs";
export const maxDuration = 60;

// Voorbeeld-PDF's voor het beoordelen van de opmaak. Alleen aan als OFFERTE_VOORBEELDEN=1
// (lokaal en voor de PR); anders bestaat deze route niet.
export async function GET(req: Request, { params }: { params: Promise<{ naam: string }> }) {
  if (process.env.OFFERTE_VOORBEELDEN !== "1") return new NextResponse("Niet gevonden", { status: 404 });
  const { naam } = await params;
  const bouw = VOORBEELDEN[naam as keyof typeof VOORBEELDEN];
  if (!bouw) return new NextResponse("Onbekend voorbeeld", { status: 404 });
  const url = new URL(req.url);
  const token = maakPrintToken({ k: "voorbeeld", n: naam, akkoord: url.searchParams.has("akkoord") || undefined, optioneel: url.searchParams.has("optioneel") || undefined });
  const inhoud = bouw();
  const pdf = await maakOffertePdf(`${url.origin}/offerte-print/${token}`, inhoud);
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${encodeURIComponent(bestandsnaam(inhoud))}"` } });
}
