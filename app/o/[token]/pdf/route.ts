import { NextResponse } from "next/server";
import { prismaBasis } from "@/app/lib/prisma";
import { laadPubliekeOfferte } from "@/app/lib/offerte/publiek";
import { zorgVoorGetekendePdf } from "@/app/lib/offerte/publiek-acties";
import { bestandsnaam } from "@/app/lib/offerte/weergave";

export const runtime = "nodejs";
export const maxDuration = 60;

// PDF voor de klant: de verstuurde versie exact zoals verstuurd, of (met ?getekend=1) de getekende PDF na akkoord.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const o = await laadPubliekeOfferte(token, Number(url.searchParams.get("v")) || undefined);
  if (!o || o.status === "INGETROKKEN") return new NextResponse("Niet gevonden", { status: 404 });
  const antwoord = (b: Uint8Array | Buffer, getekend: boolean) =>
    new NextResponse(new Uint8Array(b), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(getekend ? bestandsnaam(o.inhoud).replace(/\.pdf$/, " – getekend.pdf") : bestandsnaam(o.inhoud))}`, "cache-control": "private, no-store" } });
  if (url.searchParams.get("getekend")) {
    if (!o.akkoord) return new NextResponse("Nog niet getekend", { status: 404 });
    const pdf = await zorgVoorGetekendePdf(o.id, url.origin);
    return pdf ? antwoord(pdf, true) : new NextResponse("De getekende PDF is nog niet klaar.", { status: 503 });
  }
  const v = await prismaBasis.offerteVersie.findFirst({ where: { offerteId: o.id, versie: o.versie, vergrendeld: true }, select: { pdfData: true } });
  return v?.pdfData ? antwoord(v.pdfData, false) : new NextResponse("Niet gevonden", { status: 404 });
}
